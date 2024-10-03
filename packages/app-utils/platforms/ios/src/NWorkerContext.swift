import Foundation
import UIKit

@objcMembers
@objc(NWorkerContext)
class NWorkerContext : NSObject {
    private static var container: [String: Any] = [:]
    static func setValue(_ key: String, _ value: Any?) {
        if (value  == nil) {
            container.removeValue(forKey: key)
        } else {
            container[key] = value
        }
    }
    static func getValue(_ key: String) -> Any? {
        return container[key]
    }
 }
  