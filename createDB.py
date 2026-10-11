"""Create the database tables.

    python createDB.py            create any missing tables, keep existing accounts
    python createDB.py --reset    DELETE every account and start over
"""
import sys

from sqlalchemy import inspect

from Orion import create_app, db
from Orion.auth.userModel import User  # noqa: F401  (importing registers the table)

app = create_app()

with app.app_context():
    print("Database:", db.engine.url)
    print("Tables registered:", list(db.metadata.tables.keys()))
    if "--reset" in sys.argv:
        db.drop_all()
        print("Dropped all tables.")
    db.create_all()
    print("Tables in database:", inspect(db.engine).get_table_names())
    print("Database ready.")
