from flask import Blueprint, render_template, redirect, url_for, request, flash
from .. import db
from flask_login import login_required, current_user

landing_bp = Blueprint(
    "landing",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/landing_static",
)

@landing_bp.route("/")
def root():
    return redirect(url_for("auth.sign_in"))

@landing_bp.route("/landing")
def home():
    return redirect(url_for("landing.index"), code=302)
