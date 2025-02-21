# Generated by Django 5.1.4 on 2025-02-21 16:33

import django.contrib.auth.validators
import django.db.models.deletion
import django.utils.timezone
import users.models.user
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='Friendship',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ],
        ),
        migrations.CreateModel(
            name='User',
            fields=[
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('first_name', models.CharField(blank=True, max_length=150, verbose_name='first name')),
                ('last_name', models.CharField(blank=True, max_length=150, verbose_name='last name')),
                ('is_staff', models.BooleanField(default=False, help_text='Designates whether the user can log into this admin site.', verbose_name='staff status')),
                ('is_active', models.BooleanField(default=True, help_text='Designates whether this user should be treated as active. Unselect this instead of deleting accounts.', verbose_name='active')),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now, verbose_name='date joined')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('username', models.CharField(max_length=50, unique=True, validators=[django.contrib.auth.validators.UnicodeUsernameValidator()])),
                ('nickname', models.CharField(max_length=50, validators=[django.contrib.auth.validators.UnicodeUsernameValidator()])),
                ('email', models.EmailField(blank=True, default='', max_length=254)),
                ('password', models.CharField(blank=True, default='', max_length=128)),
                ('mfa_enabled', models.BooleanField(default=False)),
                ('mfa_secret', models.CharField(blank=True, default='', max_length=128)),
                ('groups', models.ManyToManyField(blank=True, help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.', related_name='user_set', related_query_name='user', to='auth.group', verbose_name='groups')),
                ('user_permissions', models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='user_set', related_query_name='user', to='auth.permission', verbose_name='user permissions')),
            ],
            options={
                'verbose_name': 'user',
                'verbose_name_plural': 'users',
                'abstract': False,
            },
            managers=[
                ('objects', users.models.user.UserManager()),
            ],
        ),
        migrations.CreateModel(
            name='OauthConnection',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('state', models.CharField(editable=False, max_length=64)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('connected', 'Connected')], editable=False, max_length=9)),
                ('connection_type', models.CharField(choices=[('42', '42 School API'), ('github', 'Github API'), ('regular', 'Our Own Auth')], max_length=7)),
                ('oauth_id', models.IntegerField(blank=True, null=True)),
                ('date', models.DateTimeField(auto_now_add=True)),
                ('user', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='oauth_connection', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-date'],
            },
        ),
        migrations.CreateModel(
            name='Profile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('profile_picture', models.ImageField(blank=True, null=True, upload_to='avatars/')),
                ('elo', models.IntegerField(default=1000)),
                ('is_online', models.BooleanField(default=True)),
                ('blocked_users', models.ManyToManyField(related_name='blocked_users_of', to='users.profile')),
                ('friends', models.ManyToManyField(related_name='friends_of', through='users.Friendship', to='users.profile')),
                ('user', models.OneToOneField(blank=True, default=None, null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Match',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('winners_score', models.IntegerField()),
                ('losers_score', models.IntegerField()),
                ('elo_change', models.IntegerField()),
                ('winners_elo', models.IntegerField(default=1000)),
                ('losers_elo', models.IntegerField(default=1000)),
                ('date', models.DateTimeField(auto_now_add=True)),
                ('loser', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='lost_matches', to='users.profile')),
                ('winner', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='won_matches', to='users.profile')),
            ],
            options={
                'verbose_name_plural': 'matches',
                'ordering': ['-date'],
            },
        ),
        migrations.AddField(
            model_name='friendship',
            name='from_profile',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='from_profile', to='users.profile'),
        ),
        migrations.AddField(
            model_name='friendship',
            name='to_profile',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='to_profile', to='users.profile'),
        ),
        migrations.CreateModel(
            name='RefreshToken',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.CharField(max_length=255, unique=True)),
                ('is_revoked', models.BooleanField(default=False)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='refresh_tokens', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(
            model_name='friendship',
            constraint=models.CheckConstraint(condition=models.Q(('from_profile', models.F('to_profile')), _negated=True), name='no_self_friendship'),
        ),
        migrations.AddConstraint(
            model_name='friendship',
            constraint=models.UniqueConstraint(fields=('from_profile', 'to_profile'), name='unique_friendship'),
        ),
    ]
