#!/usr/bin/env python
"""
Fast test runner for users module with optimizations
"""
import os
import sys
import django
from django.conf import settings
from django.test.utils import get_runner

if __name__ == "__main__":
    os.environ['DJANGO_SETTINGS_MODULE'] = 'server.settings'
    
    # Override settings for faster tests
    os.environ.setdefault('DJANGO_TEST_PROCESSES', '1')
    
    django.setup()
    
    # Use parallel testing if available
    from django.core.management import execute_from_command_line
    
    # Run only users tests with optimizations
    sys.argv = [
        'manage.py', 
        'test', 
        'users.tests',
        '--parallel', '2',  # Use 2 parallel processes
        '--keepdb',         # Keep test database between runs
        '--verbosity=1',    # Reduce verbosity
        '--debug-mode',     # Skip system checks
    ]
    
    execute_from_command_line(sys.argv)