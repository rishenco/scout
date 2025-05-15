package tools

import (
	"context"

	"github.com/rishenco/scout/internal/pg"
)

type ServiceRequestsStorage struct {
	requestsStorage *pg.RequestsStorage
	service         string
}

func WrapRequestsStorage(requestsStorage *pg.RequestsStorage, service string) *ServiceRequestsStorage {
	return &ServiceRequestsStorage{
		requestsStorage: requestsStorage,
		service:         service,
	}
}

func (s *ServiceRequestsStorage) Save(ctx context.Context, requestType string, request interface{}, response interface{}) error {
	return s.requestsStorage.Save(ctx, s.service, requestType, request, response)
}
