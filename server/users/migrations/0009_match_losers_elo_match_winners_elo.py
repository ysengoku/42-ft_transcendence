# Generated by Django 5.1.4 on 2025-01-17 16:27

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0008_alter_match_loser_alter_match_winner'),
    ]

    operations = [
        migrations.AddField(
            model_name='match',
            name='losers_elo',
            field=models.IntegerField(default=1000),
        ),
        migrations.AddField(
            model_name='match',
            name='winners_elo',
            field=models.IntegerField(default=1000),
        ),
    ]
