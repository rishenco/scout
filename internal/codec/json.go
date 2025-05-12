package codec

import (
	"encoding/json"
	"fmt"
)

type JSONCodec[T any] struct{}

func (c JSONCodec[T]) Encode(v T) ([]byte, error) {
	data, err := json.Marshal(v)
	if err != nil {
		return nil, fmt.Errorf("marshal json: %w", err)
	}

	return data, nil
}

func (c JSONCodec[T]) Decode(data []byte) (T, error) {
	var v T
	if err := json.Unmarshal(data, &v); err != nil {
		return v, fmt.Errorf("unmarshal json: %w", err)
	}

	return v, nil
}
