package tools

import (
	"context"
)

type requestsStorage interface {
	Save(ctx context.Context, service string, requestType string, request interface{}, response interface{}) error
}

type ServiceRequestsStorage struct {
	requestsStorage requestsStorage
	service         string
}

func WrapRequestsStorage(requestsStorage requestsStorage, service string) *ServiceRequestsStorage {
	return &ServiceRequestsStorage{
		requestsStorage: requestsStorage,
		service:         service,
	}
}

func (s *ServiceRequestsStorage) Save(ctx context.Context, requestType string, request interface{}, response interface{}) error {
	return s.requestsStorage.Save(ctx, s.service, requestType, request, response)
}
