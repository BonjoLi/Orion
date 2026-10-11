"""Create the database tables.

    python createDB.py            create any missing tables, keep existing accounts
    python createDB.py --reset    DELETE every account and start over
"""
import sys

from Orion import create_app, db
from Orion.auth.userModel import User  # noqa: F401  (importing registers the table)

app = create_app()

with app.app_context():
    if "--reset" in sys.argv:
        db.drop_all()
        print("Dropped all tables.")
    db.create_all()
    print("Database ready.")
