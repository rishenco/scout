package nullable

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
