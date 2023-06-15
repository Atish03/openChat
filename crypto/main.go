package main

import (
	"syscall/js"
	"github.com/Atish03/openChat/crypto/lattenc"
	"github.com/tuneinsight/lattigo/v4/rlwe"
	"encoding/json"
)

type encrypted struct {
	D int `json:"d"`
	L int `json:"l"`
	Len int `json:"len"`
	Cipher string `json:"cipher"`
}

func main() {
	c := make(chan struct{}, 0)
	js.Global().Set("encrypt", js.FuncOf(Encrypt))
	js.Global().Set("decrypt", js.FuncOf(Decrypt))
	<-c
}

func Encrypt(this js.Value, args []js.Value) interface{} {
	data := args[0].String()
	pubKey := args[1].String()
	dataLen := len(data)

	tool := lattenc.NewTool()
	pk := tool.KeyFromB64(pubKey, "pk").(*rlwe.PublicKey)

	enc, d, l := tool.Encrypt(data, pk)
	encData, _ := json.Marshal(encrypted{ d, l, dataLen, enc })

	return js.ValueOf(string(encData))
}

func Decrypt(this js.Value, args []js.Value) interface{} {
	data := args[0].String()
	secKey := args[1].String()

	e := new(encrypted);

	_ = json.Unmarshal([]byte(data), e)

	tool := lattenc.NewTool()
	sk := tool.KeyFromB64(secKey, "sk").(*rlwe.SecretKey)

	dec := tool.Decrypt(e.Cipher, e.Len, sk, e.D, e.L)

	return js.ValueOf(dec)
}