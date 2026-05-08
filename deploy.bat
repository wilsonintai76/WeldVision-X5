@echo off
:: WeldVision-X5 — deploy wrapper
:: Usage:
::   deploy            (patch bump)
::   deploy minor
::   deploy major
::   deploy minor "New feature: ..."
::   deploy patch -SkipWorker
::
:: Forwards all arguments to deploy.ps1

powershell -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" %*
