# Generated by Django 5.1.4 on 2025-01-19 19:41

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0011_alter_match_options_alter_profile_friends'),
    ]

    operations = [
        migrations.AlterField(
            model_name='profile',
            name='friends',
            field=models.ManyToManyField(related_name='friends', to='users.profile'),
        ),
    ]
