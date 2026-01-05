import Foundation
import Capacitor

@objc(SiriQueuePlugin)
public class SiriQueuePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SiriQueuePlugin"
    public let jsName = "SiriQueue"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getAndClear", returnType: CAPPluginReturnPromise)
    ]

    @objc func getAndClear(_ call: CAPPluginCall) {
        let items = SiriQueueStore.drain()
        let result = items.map { item -> [String: Any] in
            var dict: [String: Any] = [
                "action": item.action,
                "timestamp": item.timestamp
            ]
            if let amount = item.amountMl { dict["amountMl"] = amount }
            if let note = item.note { dict["note"] = note }
            if let type = item.type { dict["type"] = type }
            if let bristol = item.bristolScale { dict["bristolScale"] = bristol }
            if let state = item.state { dict["state"] = state }
            return dict
        }
        call.resolve([
            "items": result
        ])
    }
}
