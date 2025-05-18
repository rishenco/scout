package tools

import (
	"context"
)

type requestsStorage interface {
	Save(ctx context.Context, service string, requestType string, request any, response any) error
}

type ServiceRequestsStorage struct {
	requestsStorage requestsStorage
	service         string
}

func (s *ServiceRequestsStorage) Save(ctx context.Context, requestType string, request any, response any) error {
	return s.requestsStorage.Save(ctx, s.service, requestType, request, response)
}

func WrapRequestsStorage(requestsStorage requestsStorage, service string) *ServiceRequestsStorage {
	return &ServiceRequestsStorage{
		requestsStorage: requestsStorage,
		service:         service,
	}
}
