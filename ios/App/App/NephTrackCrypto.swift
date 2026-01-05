import Foundation
import CommonCrypto
import CryptoKit

enum Output TrackerCrypto {
    private static let iterations: UInt32 = 100_000
    private static let salt = "nephtrack-salt-static".data(using: .utf8)!

    static func encryptJSON(_ object: Any, passphrase: String) throws -> String {
        let key = try deriveKey(passphrase: passphrase)
        let data = try JSONSerialization.data(withJSONObject: object, options: [])

        var iv = Data(count: 12)
        let ivStatus = iv.withUnsafeMutableBytes { buf in
            SecRandomCopyBytes(kSecRandomDefault, 12, buf.baseAddress!)
        }
        if ivStatus != errSecSuccess {
            throw NSError(domain: "Output TrackerCrypto", code: Int(ivStatus))
        }

        let sealed = try AES.GCM.seal(data, using: SymmetricKey(data: key), nonce: AES.GCM.Nonce(data: iv))
        var combined = Data()
        combined.append(sealed.ciphertext)
        combined.append(sealed.tag)

        let out = iv + combined
        return out.base64EncodedString()
    }

    private static func deriveKey(passphrase: String) throws -> Data {
        let passwordData = passphrase.data(using: .utf8) ?? Data()
        var derived = Data(count: 32)

        let status = derived.withUnsafeMutableBytes { derivedBuf in
            salt.withUnsafeBytes { saltBuf in
                passwordData.withUnsafeBytes { passwordBuf in
                    CCKeyDerivationPBKDF(
                        CCPBKDFAlgorithm(kCCPBKDF2),
                        passwordBuf.baseAddress!.assumingMemoryBound(to: Int8.self),
                        passwordData.count,
                        saltBuf.baseAddress!.assumingMemoryBound(to: UInt8.self),
                        salt.count,
                        CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256),
                        iterations,
                        derivedBuf.baseAddress!.assumingMemoryBound(to: UInt8.self),
                        32
                    )
                }
            }
        }

        if status != kCCSuccess {
            throw NSError(domain: "Output TrackerCrypto", code: Int(status))
        }

        return derived
    }
}
