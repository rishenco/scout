package nullable

// Nullable is a wrapper around a value that can be either set, unset, or null.
//
// This is useful for cases when you need to implement partial updates of data that has nullable fields.
type Nullable[T any] struct {
	Value *T
	Set   bool
}

func (n *Nullable[T]) IsSet() bool {
	return n.Set
}

func Value[T any](value T) Nullable[T] {
	return Nullable[T]{Value: &value, Set: true}
}

func Unset[T any]() Nullable[T] {
	return Nullable[T]{Value: nil, Set: false}
}

func Null[T any]() Nullable[T] {
	return Nullable[T]{Value: nil, Set: true}
}
