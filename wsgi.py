import os

from Orion import create_app

app = create_app()

if __name__ == "__main__":
    # Listens on this computer only: the Next.js app (port 3000) is the public front door and
    # forwards /login, /sign-up and /profile here. debug=True shows an interactive debugger,
    # so don't open it to the network; set ORION_HOST=0.0.0.0 only if you must and have turned
    # debug off (ORION_DEBUG=0).
    app.run(
        host=os.environ.get("ORION_HOST", "127.0.0.1"),
        port=int(os.environ.get("ORION_PORT", "8080")),
        debug=os.environ.get("ORION_DEBUG", "1") == "1",
    )
