package lattenc

import (
	"fmt"
	"github.com/tuneinsight/lattigo/v4/bgv"
	"github.com/tuneinsight/lattigo/v4/rlwe"
	"encoding/base64"
	"encoding/binary"
)

type Tool struct {
	params bgv.Parameters
	RLWEparams rlwe.Parameters
	Encoder bgv.Encoder
	Encryptor rlwe.Encryptor
	Decryptor rlwe.Decryptor
	KeyGenerator rlwe.KeyGenerator
}

func byteToUint64(data []byte) (arr []uint64) {
	SIZE_OF_UINT64 := 1 // Encode-Decode does not support numbers above 10,000 though it is uint64 XD
	toPad := SIZE_OF_UINT64 - (len(data) % SIZE_OF_UINT64)
	pad := make([]byte, toPad)
	data = append(data, pad...)

	arr = make([]uint64, len(data) / SIZE_OF_UINT64)

	for i := range arr {
		// arr[i] = binary.LittleEndian.Uint64(data[i * SIZE_OF_UINT64 : (i + 1) * SIZE_OF_UINT64])
		arr[i] = uint64(data[i])
	}

	return
}

func uint64ToByte(data []uint64) (arr []byte) {
	SIZE_OF_UINT64 := 8
	arr = make([]byte, 0)

	for i := range data {
		raw := make([]byte, SIZE_OF_UINT64)
		binary.LittleEndian.PutUint64(raw, data[i])
		arr = append(arr, raw[0])
	}

	size := len(arr)
	ind := 0

	for ind = size - 1; ind >= 0; ind-- {
		if arr[ind] != 0 {
			break
		}
	}

	arr = arr[0 : ind + 1]

	return
}

func NewTool() (tool *Tool, err error) {
	tool = new(Tool)
	params, err := bgv.NewParametersFromLiteral(bgv.PN12QP109)
	RLWEparams, err := rlwe.NewParametersFromLiteral(bgv.PN12QP109.RLWEParameters())

	if err != nil {
		fmt.Println(err)
		return
	}

	tool.params = params
	tool.RLWEparams = RLWEparams
	tool.KeyGenerator = bgv.NewKeyGenerator(tool.params)
	tool.Encoder = bgv.NewEncoder(tool.params)

	return
}

func (tool *Tool) GenKeys() (string, string) {
	sk, pk := tool.KeyGenerator.GenKeyPair()
	skString, _ := sk.MarshalBinary()
	pkString, _ := pk.MarshalBinary()

	return base64.StdEncoding.EncodeToString(skString), base64.StdEncoding.EncodeToString(pkString)
}

func (tool *Tool) KeyFromB64(key string, t string) (interface{}) {
	d, _ := base64.StdEncoding.DecodeString(key)
	switch t {
	case "sk":
		sk := rlwe.NewSecretKey(tool.RLWEparams)
		sk.UnmarshalBinary(d)
		return sk

	case "pk":
		pk := rlwe.NewPublicKey(tool.RLWEparams)
		pk.UnmarshalBinary(d)
		return pk

	default:
		fmt.Println("Not a valid type of key (can be either 'sk' or 'pk')")
	}

	return 0
}

func (tool *Tool) Encrypt(data string, pk *rlwe.PublicKey) (ciphertext string, degree, level int) {
	encryptor := bgv.NewEncryptor(tool.params, pk)
	arr := byteToUint64([]byte(data))
	pt := bgv.NewPlaintext(tool.params, 0)

	tool.Encoder.EncodeCoeffs(arr, pt)

	cipher := encryptor.EncryptNew(pt)
	degree = cipher.Degree()
	level = cipher.Level()

	ct, err := cipher.MarshalBinary()

	if err != nil {
		fmt.Println(err)
	}

	ciphertext = base64.StdEncoding.EncodeToString(ct)

	return
}

func (tool *Tool) Decrypt(data string, length int, sk *rlwe.SecretKey, degree, level int) (decrypted string) {
	decryptor := bgv.NewDecryptor(tool.params, sk)
	ct := bgv.NewCiphertext(tool.params, degree, level)
	rawData, _ := base64.StdEncoding.DecodeString(data)
	err := ct.UnmarshalBinary(rawData)

	pt := decryptor.DecryptNew(ct)

	if err != nil {
		fmt.Println(err)
	}

	text := make([]uint64, length)
	tool.Encoder.DecodeCoeffs(pt, text)

	decrypted = string(uint64ToByte(text))

	return
}