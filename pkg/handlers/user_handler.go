package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/model"
)

type createPasswordUser struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Name     string `json:"name"`
}

func CreateSuperUser(c *gin.Context) {
	var userreq createPasswordUser
	if err := c.ShouldBindJSON(&userreq); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	uc, err := model.CountUsers()
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to count users"})
		return
	}

	if uc > 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "super user already exists"})
		return
	}
	user := &model.User{
		Username: userreq.Username,
		Password: userreq.Password,
		Name:     userreq.Name,
		Provider: "password",
	}
	if err := model.AddUser(user); err != nil {
		c.JSON(500, gin.H{"error": "failed to create user"})
		return
	}
	c.JSON(201, user)
}

func CreatePasswordUser(c *gin.Context) {
	var userreq createPasswordUser
	if err := c.ShouldBindJSON(&userreq); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	// check only admin or users count is zero
	user := &model.User{
		Username: userreq.Username,
		Password: userreq.Password,
		Name:     userreq.Name,
		Provider: "password",
	}

	_, err := model.GetUserByUsername(user.Username)
	if err == nil {
		c.JSON(400, gin.H{"error": "user already exists"})
		return
	}

	if err := model.AddUser(user); err != nil {
		c.JSON(500, gin.H{"error": "failed to create user"})
		return
	}
	c.JSON(201, user)
}
