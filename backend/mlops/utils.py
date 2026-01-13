"""
MLOps Utilities - SSH/SCP Deployment Functions

Uses Paramiko for secure file transfer and remote command execution on RDK X5
"""
import paramiko
import os
import logging
from datetime import datetime
from django.conf import settings

logger = logging.getLogger(__name__)


class RDKDeploymentError(Exception):
    """Custom exception for RDK deployment errors"""
    pass


def deploy_to_rdk(ip, username, password, local_file_path, remote_path=None):
    """
    Deploy model file to RDK X5 using SCP
    
    Args:
        ip (str): RDK X5 IP address
        username (str): SSH username
        password (str): SSH password
        local_file_path (str): Path to local model file
        remote_path (str): Remote destination path (default: /home/sunrise/welding_app/model_update.bin)
    
    Returns:
        dict: Deployment result with status and logs
        
    Important:
        - Sends to model_update.bin (NOT model.bin directly)
        - RDK script handles atomic swap
        - Prevents corruption of active model
    """
    if not remote_path:
        remote_path = settings.RDK_MODEL_PATH
    
    ssh = None
    sftp = None
    
    try:
        # Initialize SSH client
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        logger.info(f"Connecting to RDK X5 at {ip}...")
        ssh.connect(
            hostname=ip,
            username=username,
            password=password,
            timeout=10,
            banner_timeout=10
        )
        
        # Open SFTP session
        sftp = ssh.open_sftp()
        
        # Get file size for progress tracking
        file_size = os.path.getsize(local_file_path)
        file_size_mb = file_size / (1024 * 1024)
        
        logger.info(f"Transferring {file_size_mb:.2f} MB to {remote_path}...")
        
        # Transfer file
        sftp.put(local_file_path, remote_path)
        
        # Verify transfer
        remote_stat = sftp.stat(remote_path)
        if remote_stat.st_size != file_size:
            raise RDKDeploymentError(
                f"File size mismatch. Local: {file_size}, Remote: {remote_stat.st_size}"
            )
        
        logger.info("File transfer completed successfully")
        
        # Set file permissions
        sftp.chmod(remote_path, 0o644)
        
        return {
            'status': 'success',
            'message': f'Model deployed successfully to {ip}',
            'file_size_mb': round(file_size_mb, 2),
            'remote_path': remote_path,
            'timestamp': datetime.now().isoformat()
        }
        
    except paramiko.AuthenticationException as e:
        error_msg = f"Authentication failed for {username}@{ip}"
        logger.error(error_msg)
        raise RDKDeploymentError(error_msg) from e
        
    except paramiko.SSHException as e:
        error_msg = f"SSH connection error: {str(e)}"
        logger.error(error_msg)
        raise RDKDeploymentError(error_msg) from e
        
    except FileNotFoundError as e:
        error_msg = f"Local file not found: {local_file_path}"
        logger.error(error_msg)
        raise RDKDeploymentError(error_msg) from e
        
    except Exception as e:
        error_msg = f"Deployment failed: {str(e)}"
        logger.error(error_msg)
        raise RDKDeploymentError(error_msg) from e
        
    finally:
        # Clean up connections
        if sftp:
            sftp.close()
        if ssh:
            ssh.close()


def reboot_rdk(ip, username, password):
    """
    Reboot RDK X5 device via SSH
    
    Args:
        ip (str): RDK X5 IP address
        username (str): SSH username
        password (str): SSH password
    
    Returns:
        dict: Reboot command result
        
    Warning:
        This will interrupt all live monitoring and data collection
    """
    ssh = None
    
    try:
        # Initialize SSH client
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        logger.info(f"Connecting to RDK X5 at {ip} for reboot...")
        ssh.connect(
            hostname=ip,
            username=username,
            password=password,
            timeout=10
        )
        
        # Execute reboot command
        # Using 'sudo reboot' - assumes user has sudo privileges
        logger.warning(f"Sending reboot command to {ip}...")
        stdin, stdout, stderr = ssh.exec_command('sudo reboot', timeout=5)
        
        # Note: Connection will likely drop before getting output
        return {
            'status': 'success',
            'message': f'Reboot command sent to {ip}',
            'timestamp': datetime.now().isoformat()
        }
        
    except paramiko.AuthenticationException as e:
        error_msg = f"Authentication failed for {username}@{ip}"
        logger.error(error_msg)
        raise RDKDeploymentError(error_msg) from e
        
    except Exception as e:
        # Timeout is expected during reboot
        if "timed out" in str(e).lower():
            logger.info("Connection lost (expected during reboot)")
            return {
                'status': 'success',
                'message': f'Reboot initiated on {ip}',
                'timestamp': datetime.now().isoformat()
            }
        
        error_msg = f"Reboot failed: {str(e)}"
        logger.error(error_msg)
        raise RDKDeploymentError(error_msg) from e
        
    finally:
        if ssh:
            ssh.close()


def check_rdk_status(ip, username, password):
    """
    Check RDK X5 device status and system info
    
    Args:
        ip (str): RDK X5 IP address
        username (str): SSH username
        password (str): SSH password
    
    Returns:
        dict: System information (uptime, memory, CPU, etc.)
    """
    ssh = None
    
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        ssh.connect(
            hostname=ip,
            username=username,
            password=password,
            timeout=10
        )
        
        # Get system info
        commands = {
            'uptime': 'uptime -p',
            'memory': 'free -m | grep Mem',
            'cpu': 'top -bn1 | grep "Cpu(s)"',
            'temperature': 'cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo "N/A"',
        }
        
        results = {}
        for key, cmd in commands.items():
            stdin, stdout, stderr = ssh.exec_command(cmd, timeout=5)
            output = stdout.read().decode().strip()
            results[key] = output
        
        return {
            'status': 'online',
            'ip': ip,
            'system_info': results,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'status': 'offline',
            'ip': ip,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }
        
    finally:
        if ssh:
            ssh.close()


def execute_remote_command(ip, username, password, command, sudo=False):
    """
    Execute arbitrary command on RDK X5
    
    Args:
        ip (str): RDK X5 IP address
        username (str): SSH username
        password (str): SSH password
        command (str): Command to execute
        sudo (bool): Execute with sudo
    
    Returns:
        dict: Command output and status
    """
    ssh = None
    
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        ssh.connect(
            hostname=ip,
            username=username,
            password=password,
            timeout=10
        )
        
        if sudo:
            command = f"sudo {command}"
        
        logger.info(f"Executing: {command}")
        stdin, stdout, stderr = ssh.exec_command(command, timeout=30)
        
        output = stdout.read().decode()
        error = stderr.read().decode()
        exit_code = stdout.channel.recv_exit_status()
        
        return {
            'status': 'success' if exit_code == 0 else 'error',
            'exit_code': exit_code,
            'stdout': output,
            'stderr': error,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        error_msg = f"Command execution failed: {str(e)}"
        logger.error(error_msg)
        raise RDKDeploymentError(error_msg) from e
        
    finally:
        if ssh:
            ssh.close()
