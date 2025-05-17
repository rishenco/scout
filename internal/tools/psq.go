package tools

import sq "github.com/Masterminds/squirrel"

func Psq() sq.StatementBuilderType {
	return sq.StatementBuilder.PlaceholderFormat(sq.Dollar)
}
