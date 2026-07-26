"""Seed the database with demo data for local development.

Usage (from backend/ with venv activated):
    python -m app.seed
"""

from datetime import date

from app.db.models import ActionItem, Meeting, TeamMember
from app.db.session import SessionLocal


def run() -> None:
    db = SessionLocal()
    try:
        if db.query(TeamMember).count() > 0:
            print("Database already has data, skipping seed.")
            return

        alice = TeamMember(name="Alice Chen", email="alice@example.com", slack_user_id="", jira_account_id="")
        bob = TeamMember(name="Bob Martinez", email="bob@example.com", slack_user_id="", jira_account_id="")
        carla = TeamMember(name="Carla Nguyen", email="carla@example.com", slack_user_id="", jira_account_id="")
        db.add_all([alice, bob, carla])
        db.flush()

        meeting = Meeting(
            title="Weekly Engineering Sync",
            meeting_date=date.today(),
            raw_notes=(
                "Discussed Q3 roadmap priorities. Alice raised concerns about the migration timeline. "
                "Bob will follow up with the infra team about the staging environment outage. "
                "Carla presented the new onboarding flow mockups, team agreed to proceed with user testing. "
                "Need to finalize the budget request before next Friday."
            ),
            status="draft",
            attendees=[alice, bob, carla],
        )
        db.add(meeting)
        db.flush()

        db.add_all(
            [
                ActionItem(
                    meeting_id=meeting.id,
                    description="Follow up with infra team on staging outage",
                    assignee_id=bob.id,
                    status="open",
                ),
                ActionItem(
                    meeting_id=meeting.id,
                    description="Schedule user testing sessions for onboarding flow",
                    assignee_id=carla.id,
                    status="open",
                ),
            ]
        )
        db.commit()
        print("Seed data created: 3 team members, 1 meeting, 2 action items.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
