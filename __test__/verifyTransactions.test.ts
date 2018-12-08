import * as generateTx from '../user/generateTx'
import * as bigInt from 'big-integer'
import * as snarkjs from 'snarkjs'
import {buffer2bits} from '../utils/data'
const eddsa = require('../../circomlib/src/eddsa')
const babyJub = require('../../circomlib/src/babyjub')

describe('Transaction verification', () => {
  describe('Hashing', () => {
    let unsignedTx: generateTx.ITransaction
    let signature: any
    let fromPrivKey = '0000000000000000000000000000000000000000000000000000000000000001';
    let toPrivKey = '0000000000000000000000000000000000000000000000000000000000000002';
    let fromA = generateTx.A(fromPrivKey)
    let fromPubKey = generateTx.pubKey(fromA)
    let toA = generateTx.A(toPrivKey)
    let toPubKey = generateTx.pubKey(toA)

    beforeAll(() => {
      unsignedTx = {
        from: fromPubKey,
        to: toPubKey,
        amount: bigInt(10),
        nonce: bigInt(4)
      }

      signature = generateTx.signTx(unsignedTx, fromPrivKey)
    })

    test('should calculate witness', () => {
      const circuitDef = require('../../circuits/snarsma.json')
      const circuit = new snarkjs.Circuit(circuitDef)
      const msg = generateTx.txToBuf(unsignedTx)
      expect(msg.length).toEqual(70)

      const msgBits = buffer2bits(msg);

      expect(msgBits.length).toEqual(70 * 8)

      const pubKey = generateTx.A(fromPrivKey);

      const verified = generateTx.verifyTx(unsignedTx, signature, fromA)
      expect(verified).toBeTruthy()

      const pSignature = eddsa.packSignature(signature);

      const r8Bits = buffer2bits(pSignature.slice(0, 32));
      const sBits = buffer2bits(pSignature.slice(32, 64));
      const aBits = buffer2bits(babyJub.packPoint(fromA))

      const w = circuit.calculateWitness({
        A: aBits,
        R8: r8Bits,
        S: sBits,
        msg: msgBits
      })
      expect(circuit.checkWitness(w)).toBeTruthy()
    })
  })
})
