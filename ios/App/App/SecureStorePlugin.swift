import Foundation
import Capacitor

@objc(SecureStorePlugin)
public class SecureStorePlugin: CAPPlugin, CAPBridgedPlugin {
    public static let identifier = "SecureStore"
    public static let jsName = "SecureStore"
    public static let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setCredentials", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearCredentials", returnType: CAPPluginReturnPromise)
    ]

    @objc func setCredentials(_ call: CAPPluginCall) {
        let token = call.getString("token") ?? ""
        let passphrase = call.getString("passphrase") ?? ""
        if token.isEmpty || passphrase.isEmpty {
            call.reject("Missing token or passphrase")
            return
        }
        do {
            try KeychainStore.set(token, account: "authToken")
            try KeychainStore.set(passphrase, account: "passphrase")
            call.resolve(["ok": true])
        } catch {
            call.reject("Failed to store credentials")
        }
    }

    @objc func clearCredentials(_ call: CAPPluginCall) {
        KeychainStore.delete(account: "authToken")
        KeychainStore.delete(account: "passphrase")
        call.resolve(["ok": true])
    }
}

