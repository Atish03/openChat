package main

import (
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt"
	"time"
	"fmt"
	_ "github.com/go-sql-driver/mysql"
	"database/sql"
	"golang.org/x/crypto/bcrypt"
	"github.com/Atish03/openChat/lattenc"
	"strings"
	"net"
	"os"
	"encoding/json"
	"errors"
)

const (
	SERVER_HOST = "0.0.0.0"
	SERVER_PORT = "8008"
	SERVER_TYPE = "tcp"
)

type newUser struct {
	Username string `json:"username" form:"username" xml:"username"`
	Password string `json:"password" form:"password" xml:"password"`
}

type message struct {
	Status string `json:"status"`
	Error string `json:"error"`
	Message string `json:"message"`
}

type token struct {
	Authorization string `json:"authorization"`
}

type sessionUser struct {
	Username string `json:"username"`
	LoggedinAt float64 `json:"iat"`
	Expire float64 `json:"exp"`
}

type data struct {
	Sender string `json:"sender"`
	Receiver string `json:"receiver"`
	Body string `json:"body"`
}

var onlineUsers = make(map[string]net.Conn)
var secret = []byte("sUp3R_S3cr37")

func handleConn() {
	fmt.Println("============ Starting Server ============")
	server, err := net.Listen(SERVER_TYPE, SERVER_HOST + ":" + SERVER_PORT)
	if err != nil {
		fmt.Println("Error listening:", err.Error())
		os.Exit(1)
	}
	fmt.Println("Server started and listening on port", SERVER_PORT)

	defer server.Close()

	for {
		conn, err := server.Accept()
		if err != nil {
			fmt.Println("Error accepting client:", err.Error())
		}

		newToken := new(token)

		buffer := make([]byte, 1024)
		mLen, err := conn.Read(buffer)

		_ = json.Unmarshal(buffer[:mLen], newToken)

		user, err := validateToken(newToken.Authorization)

		if err != nil {
			fmt.Println(err)
			conn.Write([]byte("Your are not authorized"))
			conn.Close()
		} else {
			conn.Write([]byte("Welcome " + user.Username))
			onlineUsers[user.Username] = conn
			go trackClient(user.Username)
		}
	}
}

func trackClient(user string) error {
	for {
		buffer := make([]byte, 1024)
		_, err := onlineUsers[user].Read(buffer)

		if err != nil {
			fmt.Println("Connection to client broke")
			if onlineUsers[user] != nil {
				onlineUsers[user].Close()
				delete(onlineUsers, user)
				return nil
			}
		}
	}
}

func validateToken(t string) (*sessionUser, error) {
	session := new(sessionUser)
	claims := jwt.MapClaims{}
	jwtToken, err := jwt.ParseWithClaims(t, claims, func(t *jwt.Token) (interface{}, error) {
		return secret, nil
	})

	if err != nil {
		return nil, err
	}

	valid := jwtToken.Valid

	if !valid {
		return nil, errors.New("invalid token")
	}

	session.Username = claims["username"].(string)
	session.LoggedinAt = claims["iat"].(float64)
	session.Expire = claims["exp"].(float64)

	return session, nil
}

func initDB() (db *sql.DB) {
	db, err := sql.Open("mysql", "root:password@tcp(mysql:3306)/openChat")

	for {
		_, err = db.Exec("SHOW TABLES;")
		if err != nil {
			fmt.Println(err)
			time.Sleep(1 * time.Second)
		} else {
			break
		}
	}

	_, err = db.Exec("CREATE TABLE user (uid INT AUTO_INCREMENT, username VARCHAR(128), password VARCHAR(128), PRIMARY KEY (uid));")
	_, err = db.Exec("ALTER TABLE user AUTO_INCREMENT = 1001")

	_, err = db.Exec("CREATE TABLE cryptoKeys (uid INT AUTO_INCREMENT, username VARCHAR(128), publicKey LONGTEXT, PRIMARY KEY (uid));")
	_, err = db.Exec("ALTER TABLE cryptoKeys AUTO_INCREMENT = 1001")

	fmt.Println("Created user & cryptoKeys table in openChat database")

	return
}

func getUserFromDB(uname string, db *sql.DB) (user *newUser, err string) {
	user = new(newUser)
	err = "username already taken"
	var uid uint64;

	e := db.QueryRow("SELECT * FROM user WHERE username=?", uname).Scan(&uid, &user.Username, &user.Password)

	if e != nil {
		fmt.Println(e)
		err = "user does not exist"
		return
	}

	return
}

func hashPassword(pwd []byte) string {
	hash, err := bcrypt.GenerateFromPassword(pwd, bcrypt.MinCost)
    
	if err != nil {
        fmt.Println(err)
    }

	return string(hash)
}

func comparePasswords(hashedPwd string, plainPwd []byte) bool {
    byteHash := []byte(hashedPwd)
    err := bcrypt.CompareHashAndPassword(byteHash, plainPwd)

    if err != nil {
        fmt.Println(err)
        return false
    }
    
    return true
}

func (nu *newUser) genToken() (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"username": nu.Username,
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(12 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString(secret)

	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func (user *sessionUser) genAndInsertKeys(db *sql.DB) (string, error) {
	tool, _ := lattenc.NewTool()
	sk, pk := tool.GenKeys();

	_, err := db.Query("INSERT INTO cryptoKeys (username, publicKey) VALUES (?, ?)", user.Username, pk)
		
	if err != nil {
		return "", err
	}

	return sk, nil
}

func (sender *sessionUser) sendMessage(d *data) error {
	d.Sender = sender.Username

	msg, err := json.Marshal(d)

	if err != nil {
		return err
	}

	exists := onlineUsers[d.Receiver]
	user_exists := onlineUsers[d.Sender]

	if exists == nil {
		return errors.New("user not online")
	}

	if user_exists == nil {
		return errors.New("You are not connected to a session")
	}

	onlineUsers[d.Receiver].Write(msg)
	onlineUsers[d.Sender].Write(msg)

	return nil
}

func main() {
	db := initDB()
	app := fiber.New()
	go handleConn()

	// ========================
	//       MIDDLEWARES
	// ========================

	app.Use("/api/register", func(c *fiber.Ctx) error {
		user := new(newUser)
		
		if err := c.BodyParser(user); err != nil {
			return err 
		}

		if user.Username == "" {
			return c.Status(400).JSON(message{ "fail", "username cannot be empty", "" })
		}

		_, e := getUserFromDB(user.Username, db)

		if e != "user does not exist" {
			return c.Status(400).JSON(message{ "fail", e, "" })
		}

		if len(user.Password) < 8 {
			return c.Status(400).JSON(message{ "fail", "password length is smaller than 8", "" })
		}

		c.Locals("user", user)

		_, err := db.Query("INSERT INTO user (username, password) VALUES (?, ?)", user.Username, hashPassword([]byte(user.Password)))

		if err != nil {
			fmt.Println(err)
		}

		return c.Next()
	})

	app.Use("/api/login", func(c *fiber.Ctx) error {
		user := new(newUser)

		if err := c.BodyParser(user); err != nil {
			return err
		}

		c.Locals("error", "")

		dbUser, e := getUserFromDB(user.Username, db)

		if e != "username already taken" {
			return c.Status(400).JSON(message{ "fail", e, "" })
		}

		c.Locals("user", user)

		correctPasswd := comparePasswords(dbUser.Password, []byte(user.Password))

		if !correctPasswd {
			return c.Status(400).JSON(message{ "fail", "incorrect credentials", "" })
		}

		return c.Next()
	})

	app.Use("/api/user", func(c *fiber.Ctx) error {
		authToken := new(token)
		err := c.ReqHeaderParser(authToken)
		session := new(sessionUser)

		if err != nil {
			fmt.Println(err)
			return c.Status(401).JSON(message{ "fail", "unauthorized", "" })
		}

		parsedToken := strings.Split(authToken.Authorization, " ")

		if parsedToken[0] != "Bearer" {
			return c.Status(401).JSON(message{ "fail", "unauthorized", "" })
		}

		claims := jwt.MapClaims{}
		jwtToken, err := jwt.ParseWithClaims(parsedToken[1], claims, func(t *jwt.Token) (interface{}, error) {
			return secret, nil
		})

		if err != nil {
			fmt.Println(err)
			return c.Status(401).JSON(message{ "fail", "unauthorized", "" })
		}

		valid := jwtToken.Valid

		if !valid {
			return c.Status(401).JSON(message{ "fail", "unauthorized", "" })
		}

		session.Username = claims["username"].(string)
		session.LoggedinAt = claims["iat"].(float64)
		session.Expire = claims["exp"].(float64)

		if float64(time.Now().Unix()) > session.Expire {
			return c.Status(401).JSON(message{ "fail", "session expired", "" })
		}

		c.Locals("session", session)
		
		return c.Next()
	})

	// ========================
	//          ROUTES
	// ========================

	app.Post("/api/register", func(c *fiber.Ctx) error {
		currUser := c.Locals("user").(*newUser)
		token, err := currUser.genToken()

		if err != nil {
			fmt.Println(err)
		}

		c.Set("Set-Cookie", "session=" + token + "; Path=/")

		return c.Status(200).JSON(message{ "success", "", "User registered successfully" })
	})

	app.Post("/api/login", func(c *fiber.Ctx) error {
		currUser := c.Locals("user").(*newUser)
		token, err := currUser.genToken()

		if err != nil {
			fmt.Println(err)
		}

		c.Set("Set-Cookie", "session=" + token + "; Path=/")

		return c.Status(200).JSON(message{ "success", "", "User logged in successfully" })
	})

	app.Get("/api/user/genkeys", func(c *fiber.Ctx) error {
		user := c.Locals("session").(*sessionUser)
		_, err := user.genAndInsertKeys(db)

		if err != nil {
			fmt.Println(err)
			return c.Status(500).JSON(message{ "fail", "", "Internal server error" })
		}

		return c.Status(200).JSON(message{ "success", "", "New keys generated successfully" })
	})

	app.Get("/pubkey/:uid", func(c *fiber.Ctx) error {
		uid := c.Params("uid")
		fmt.Println("userid:", uid)
		var key string;
		e := db.QueryRow("SELECT publicKey FROM cryptoKeys WHERE uid=?", uid).Scan(&key);

		if e != nil {
			fmt.Println(e)
			return c.Status(400).JSON(message{ "fail", "Some error occured", "" })
		}
		
		return c.Status(200).JSON(message{ "success", "", key })
	})

	app.Post("/api/user/send", func(c *fiber.Ctx) error {
		user := c.Locals("session").(*sessionUser)
		d := new(data)
		
		if err := c.BodyParser(d); err != nil {
			fmt.Println(err)
			return c.Status(500).JSON(message{ "fail", "", "Internal server error" })
		}

		if err := user.sendMessage(d); err != nil {
			return c.Status(400).JSON(message{ "fail", err.Error(), "" })
		}

		return c.Status(200).JSON(message{ "success", "", "Your message was sent" })
	})

	app.Get("/api/user/verify", func(c *fiber.Ctx) error {
		return c.Status(200).JSON(message{ "success", "", "Verified" })
	})

	// ========================
	//         SERVER
	// ========================

	err := app.Listen(":2003")

	if err != nil {
		panic(err)
	}
}