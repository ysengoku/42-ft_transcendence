# Generated by Django 5.1.4 on 2025-01-27 15:38

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='blocked_users',
            field=models.ManyToManyField(to='users.profile'),
        ),
    ]
