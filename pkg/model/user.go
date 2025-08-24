package model

import (
	"github.com/zxh326/kite/pkg/utils"
)

type User struct {
	Model
	Username  string `json:"username" gorm:"type:varchar(50);uniqueIndex;not null"`
	Password  string `json:"-" gorm:"type:varchar(255)"`
	Name      string `json:"name,omitempty" gorm:"type:varchar(100)"`
	AvatarURL string `json:"avatar_url,omitempty" gorm:"type:varchar(500)"`
	Provider  string `json:"provider,omitempty" gorm:"type:varchar(50);default:password"`
}

func AddUser(user *User) error {
	// Hash the password before storing it
	hash, err := utils.HashPassword(user.Password)
	if err != nil {
		return err
	}
	user.Password = hash
	return DB.Create(user).Error
}

func CountUsers() (count int64, err error) {
	return count, DB.Model(&User{}).Count(&count).Error
}

func GetUserByUsername(username string) (*User, error) {
	var user User
	if err := DB.Where("username = ?", username).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func CheckPassword(hashedPassword, plainPassword string) bool {
	return utils.CheckPasswordHash(plainPassword, hashedPassword)
}
