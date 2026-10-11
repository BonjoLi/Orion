import os
from urllib.parse import urlsplit

from flask import Blueprint, redirect, render_template, request

landing_bp = Blueprint(
    "landing",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/landing_static",
)

# The Next.js app serves the map. Port used when FRONTEND_URL isn't set.
FRONTEND_PORT = 3000


def frontend_url():
    """Where the Next.js app is, for people who opened this Flask server directly.

    FRONTEND_URL wins when set (a deployed site). Otherwise: the host the visitor used to
    reach us, on the frontend's port, so it works from a phone or another computer as well
    as from this one, with no "localhost" written into any page.
    """
    configured = os.environ.get("FRONTEND_URL", "").rstrip("/")
    if configured:
        return configured
    host = urlsplit(f"//{request.host}").hostname or "localhost"
    host = f"[{host}]" if ":" in host else host  # IPv6 literal
    return f"{request.scheme}://{host}:{FRONTEND_PORT}"


@landing_bp.route("/")
@landing_bp.route("/home")
def home():
    return render_template("index.html")


@landing_bp.route("/about")
def about():
    return render_template("about.html")


@landing_bp.route("/map")
def map_page():
    return redirect(f"{frontend_url()}/map")


@landing_bp.route("/sign-in")
def sign_in():
    return redirect("/login")
