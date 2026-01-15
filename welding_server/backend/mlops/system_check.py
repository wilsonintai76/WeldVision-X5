"""
System Requirements Checker for ML Training
"""
import psutil
import platform
import subprocess


def check_gpu_availability():
    """Check if NVIDIA GPU is available"""
    try:
        # Try to run nvidia-smi
        result = subprocess.run(
            ['nvidia-smi', '--query-gpu=name,memory.total', '--format=csv,noheader'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            gpu_info = result.stdout.strip().split('\n')
            gpus = []
            for line in gpu_info:
                if line:
                    parts = line.split(',')
                    if len(parts) >= 2:
                        gpus.append({
                            'name': parts[0].strip(),
                            'memory_mb': int(parts[1].strip().split()[0])
                        })
            return {'available': True, 'gpus': gpus}
        return {'available': False, 'gpus': []}
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        return {'available': False, 'gpus': []}


def check_system_resources():
    """
    Check system resources for ML training capability
    
    Returns:
        dict: System information and recommendations
    """
    # Get system info
    cpu_count = psutil.cpu_count(logical=False)  # Physical cores
    cpu_count_logical = psutil.cpu_count(logical=True)
    ram_gb = psutil.virtual_memory().total / (1024 ** 3)
    
    # Check GPU
    gpu_info = check_gpu_availability()
    
    # Determine capability level
    meets_minimum = False
    meets_recommended = False
    can_train = False
    warnings = []
    recommendations = []
    
    # Minimum requirements for basic training (CPU only, small datasets)
    MIN_RAM_GB = 8
    MIN_CPU_CORES = 4
    
    # Recommended requirements for efficient training
    REC_RAM_GB = 16
    REC_CPU_CORES = 8
    REC_GPU_MEMORY_MB = 6144  # 6GB VRAM
    
    # Check RAM
    if ram_gb < MIN_RAM_GB:
        warnings.append(f"Insufficient RAM: {ram_gb:.1f}GB (minimum: {MIN_RAM_GB}GB)")
        recommendations.append("Training models requires at least 8GB RAM. Consider using cloud services or a more powerful machine.")
    elif ram_gb < REC_RAM_GB:
        warnings.append(f"RAM below recommended: {ram_gb:.1f}GB (recommended: {REC_RAM_GB}GB)")
        recommendations.append("Training may be slow. Consider upgrading RAM or using smaller batch sizes.")
        meets_minimum = True
    else:
        meets_recommended = True
    
    # Check CPU
    if cpu_count < MIN_CPU_CORES:
        warnings.append(f"Insufficient CPU cores: {cpu_count} (minimum: {MIN_CPU_CORES})")
        recommendations.append("Training requires at least 4 CPU cores for efficient data loading.")
    elif cpu_count < REC_CPU_CORES:
        warnings.append(f"CPU cores below recommended: {cpu_count} (recommended: {REC_CPU_CORES})")
        recommendations.append("Training will work but may be slower. Consider using fewer workers.")
    
    # Check GPU
    if not gpu_info['available']:
        warnings.append("No NVIDIA GPU detected - CPU-only training will be very slow")
        recommendations.append("⚠️ CRITICAL: GPU is highly recommended for YOLO training. Consider:")
        recommendations.append("  • Use Google Colab (Free GPU): https://colab.research.google.com/")
        recommendations.append("  • Use Roboflow (Free tier available): https://roboflow.com/")
        recommendations.append("  • Train on a cloud platform (AWS, GCP, Azure)")
        recommendations.append("  • Use a desktop/laptop with NVIDIA GPU")
        recommendations.append("  • Import pre-trained models instead of training")
    else:
        gpu = gpu_info['gpus'][0]
        if gpu['memory_mb'] < REC_GPU_MEMORY_MB:
            warnings.append(f"GPU VRAM below recommended: {gpu['memory_mb']}MB (recommended: {REC_GPU_MEMORY_MB}MB)")
            recommendations.append("Training is possible but use smaller models or batch sizes.")
            meets_minimum = True
            can_train = True
        else:
            meets_recommended = True
            can_train = True
    
    # Determine overall capability
    capability_level = "insufficient"
    if meets_recommended and can_train:
        capability_level = "excellent"
    elif meets_minimum and can_train:
        capability_level = "adequate"
    elif meets_minimum:
        capability_level = "minimal"  # Can train on CPU but not recommended
    
    return {
        'system': {
            'os': platform.system(),
            'platform': platform.platform(),
            'cpu_cores': cpu_count,
            'cpu_cores_logical': cpu_count_logical,
            'ram_gb': round(ram_gb, 2),
            'gpu': gpu_info
        },
        'capability': {
            'level': capability_level,
            'can_train_gpu': can_train,
            'can_train_cpu': meets_minimum,
            'meets_minimum': meets_minimum,
            'meets_recommended': meets_recommended
        },
        'warnings': warnings,
        'recommendations': recommendations,
        'alternatives': [
            {
                'name': 'Google Colab',
                'description': 'Free GPU training in the cloud',
                'url': 'https://colab.research.google.com/',
                'cost': 'Free (with limits)',
                'difficulty': 'Easy'
            },
            {
                'name': 'Roboflow Train',
                'description': 'Automated YOLO training service',
                'url': 'https://roboflow.com/',
                'cost': 'Free tier available',
                'difficulty': 'Very Easy'
            },
            {
                'name': 'Ultralytics HUB',
                'description': 'Official YOLOv8 training platform',
                'url': 'https://hub.ultralytics.com/',
                'cost': 'Free tier available',
                'difficulty': 'Very Easy'
            },
            {
                'name': 'Import Pre-trained Model',
                'description': 'Use models trained elsewhere',
                'url': None,
                'cost': 'Free',
                'difficulty': 'Easy'
            }
        ]
    }


def get_training_recommendation():
    """
    Get a simple recommendation for training capability
    
    Returns:
        dict: Simple yes/no recommendation with message
    """
    check = check_system_resources()
    
    if check['capability']['level'] == 'excellent':
        return {
            'can_train': True,
            'should_train_locally': True,
            'message': '✓ System meets all requirements for efficient local training',
            'alternative_recommended': False
        }
    elif check['capability']['level'] == 'adequate':
        return {
            'can_train': True,
            'should_train_locally': True,
            'message': '⚠ System can train but may be slower than recommended',
            'alternative_recommended': False
        }
    elif check['capability']['level'] == 'minimal':
        return {
            'can_train': True,
            'should_train_locally': False,
            'message': '⚠️ CPU-only training is VERY slow. Cloud training strongly recommended.',
            'alternative_recommended': True
        }
    else:
        return {
            'can_train': False,
            'should_train_locally': False,
            'message': '❌ System does not meet minimum requirements. Use cloud services or import models.',
            'alternative_recommended': True
        }
