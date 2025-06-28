package i18n

import (
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/jingyuexing/i18n"
)

var (
	initLocal = ""
	Translate map[string]any
	I18N      *i18n.I18n
)

func init() {
	locales := []string{"zh-Hans", "en"}
	for _, locale := range locales {
		filename := filepath.Join("pkg/locales", locale+".json")

		data, err := os.ReadFile(filename)
		if err != nil {
			panic("Failed to read locale file " + filename + ": " + err.Error())
		}

		localeStruct := &Locales{}
		if err := json.Unmarshal(data, localeStruct); err != nil {
			panic("Failed to unmarshal locale " + locale + ": " + err.Error())
		}
		Translate[locale] = localeStruct
	}

	initLocal = "en" // 默认语言
	I18N = i18n.CreateI18n(&i18n.Options{
		Local:          initLocal,
		FallbackLocale: "en",
		Message:        Translate,
	})
}
