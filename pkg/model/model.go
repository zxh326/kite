package model

import (
	"log"
	"os"
	"sync"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/zxh326/kite/pkg/common"
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
	ID        uint      `json:"id" gorm:"primarykey"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
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

	// For SQLite we must enable foreign key enforcement explicitly.
	// SQLite has foreign key constraints defined in the schema but they are
	// not enforced unless PRAGMA foreign_keys = ON is set on the connection.
	if common.DBType == "sqlite" {
		if err := DB.Exec("PRAGMA foreign_keys = ON").Error; err != nil {
			panic("failed to enable sqlite foreign keys: " + err.Error())
		}
	}
	models := []interface{}{
		User{},
		Cluster{},
		OAuthProvider{},
		Role{},
		RoleAssignment{},
	}
	for _, model := range models {
		err = DB.AutoMigrate(model)
		if err != nil {
			panic("failed to migrate database: " + err.Error())
		}
	}
}
