dev:
	docker compose up --build

down:
	docker compose down

migrate:
	docker compose exec api alembic upgrade head

migration:
	docker compose exec api alembic revision --autogenerate -m "$(name)"

logs:
	docker compose logs -f
