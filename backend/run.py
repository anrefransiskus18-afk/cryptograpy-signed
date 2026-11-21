from app import create_app, init_database_and_seed

app = create_app()

if __name__ == "__main__":
    init_database_and_seed()
    app.run(host="0.0.0.0", port=8000, debug=False)
