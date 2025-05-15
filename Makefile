.PHONY: run
run:
	set -a && \
	. ./.env && \
	set +a && \
	go run ./cmd/scout

.PHONY: drop-db
drop-db:
	set -a && \
	. ./.env && \
	GOOSE_DRIVER=postgres \
	GOOSE_DBSTRING=$(GOOSE_POSTGRES_CONN_STRING) \
	goose -dir ./migrations reset

.PHONY: init-db
init-db:
	set -a && \
	. ./.env && \
	GOOSE_DRIVER=postgres \
	GOOSE_DBSTRING=$(GOOSE_POSTGRES_CONN_STRING) \
	goose -dir ./migrations up

.PHONY: reinit-db
reinit-db:
	$(MAKE) drop-db
	$(MAKE) init-db

.PHONY: open-swagger
open-swagger:
	open http://localhost:5601/swagger.yaml

.PHONY: generate
generate:
	go generate ./...