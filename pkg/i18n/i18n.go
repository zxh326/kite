package i18n

import (
	"github.com/jingyuexing/i18n"
)

var (
	initLocal = ""
	Translate map[string]any
)

var I18N *i18n.I18n = i18n.CreateI18n(&i18n.Options{
	Local:          initLocal,
	FallbackLocale: "en",
	Message:        Translate,
})
