# Generated by Django 5.1.4 on 2025-03-23 12:11

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('users', '0004_delete_match'),
    ]

    operations = [
        migrations.CreateModel(
            name='Match',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('winners_score', models.IntegerField()),
                ('losers_score', models.IntegerField()),
                ('elo_change', models.IntegerField()),
                ('winners_elo', models.IntegerField()),
                ('losers_elo', models.IntegerField()),
                ('date', models.DateTimeField(auto_now_add=True)),
                ('loser', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='lost_matches', to='users.profile')),
                ('winner', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='won_matches', to='users.profile')),
            ],
            options={
                'verbose_name_plural': 'matches',
                'ordering': ['-date'],
            },
        ),
    ]
