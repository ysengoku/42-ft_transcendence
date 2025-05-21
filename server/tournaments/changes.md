Moved statuses to constants:
```python
class Tournament(models.Model):
    PENDING = "pending"
    ONGOING = "ongoing"
    FINISHED = "finished"
    CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (PENDING, "Lobby"),
        (ONGOING, "Ongoing"),
        (FINISHED, "Finished"),
        (CANCELLED, "Cancelled"),
    ]
```
Did the same for the rest of the models in the `tournaments.models`.
Statuses are best to be stored on the class as constants, to avoid typing errors. I changed direct string in `populate_db` script to constants as well. While at it, I fixed `populate_db` script and to use correct values for the fixed `Tournament` model.

Changed also status `lobby` and `start` to `pending`, because they are not an adjectives and are confusing. Didn't touch the rest.

Moved tournament creation logic to its own function:
```python
    def validate_and_create(self, name: str, creator: Profile, required_participants: int):
        tournament = self.model(
            name=name,
            creator=creator,
            required_participants=required_participants,
            status=self.model.PENDING,
        )
        tournament.full_clean()
        tournament.save()
        tournament.add_participant(creator)
        return tournament
```

On the API, added all the missing fields specified by the spec on the Google docs.
