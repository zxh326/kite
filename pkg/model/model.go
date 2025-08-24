package model

import (
	"database/sql/driver"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/zxh326/kite/pkg/common"
	"github.com/zxh326/kite/pkg/utils"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	DB *gorm.DB

	once sync.Once
)

type Model struct {
	ID        uint `gorm:"primarykey"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type SecretString string

// Scan implements the sql.Scanner interface for reading encrypted data from database
func (s *SecretString) Scan(value interface{}) error {
	if value == nil {
		*s = ""
		return nil
	}
	var encryptedStr string
	switch v := value.(type) {
	case string:
		encryptedStr = v
	case []byte:
		encryptedStr = string(v)
	default:
		return fmt.Errorf("cannot scan %T into SecretString", value)
	}
	// If the string is empty, just set it directly
	if encryptedStr == "" {
		*s = ""
		return nil
	}

	// Decrypt the string
	decrypted, err := utils.DecryptString(encryptedStr)
	if err != nil {
		return fmt.Errorf("failed to decrypt SecretString: %w", err)
	}
	*s = SecretString(decrypted)
	return nil
}

// Value implements the driver.Valuer interface for writing encrypted data to database
func (s SecretString) Value() (driver.Value, error) {
	if s == "" {
		return "", nil
	}
	encrypted := utils.EncryptString(string(s))
	if len(encrypted) > 17 && encrypted[:17] == "encryption_error:" {
		return nil, fmt.Errorf("encryption failed: %s", encrypted[17:])
	}
	return encrypted, nil
}

func InitDB() {
	dsn := common.DBDSN

	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags), // io writer
		logger.Config{
			SlowThreshold: time.Second,
			LogLevel:      logger.Info,
			Colorful:      false,
		},
	)

	var err error
	once.Do(func() {
		if common.DBType == "sqlite" {
			DB, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{
				Logger: newLogger,
			})
			if err != nil {
				panic("failed to connect database: " + err.Error())
			}
		}

		if common.DBType == "mysql" {
			DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
			if err != nil {
				panic("failed to connect database: " + err.Error())
			}
		}

		if common.DBType == "postgres" {
			DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
			if err != nil {
				panic("failed to connect database: " + err.Error())
			}
		}
	})

	if DB == nil {
		panic("database connection is nil, check your DB_TYPE and DB_DSN settings")
	}
	models := []interface{}{
		User{},
		Cluster{},
	}
	for _, model := range models {
		err = DB.AutoMigrate(model)
		if err != nil {
			panic("failed to migrate database: " + err.Error())
		}
	}
}
