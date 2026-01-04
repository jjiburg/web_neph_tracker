import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @AppStorage("autoBackupEnabled") private var autoBackupEnabled = true
    @AppStorage("lastAutoBackupDay") private var lastAutoBackupDay = ""
    @AppStorage("lastAutoBackupFilename") private var lastAutoBackupFilename = ""
    
    @State private var selectedTab: TabItem = .log

    var body: some View {
        ZStack {
            // Background is global now
            LiquidBackground()
            
            // Main Content Area
            ZStack {
                switch selectedTab {
                case .log:
                    QuickLogView()
                case .history:
                    HistoryView()
                case .summary:
                    SummaryView()
                case .settings:
                    SettingsView()
                }
            }
            .safeAreaInset(edge: .bottom) {
                Color.clear.frame(height: 80) // Spacing for tab bar
            }
            
            // Floating Tab Bar
            VStack {
                Spacer()
                FloatingTabBar(selected: $selectedTab)
                    .padding(.bottom, 20)
            }
        }
        .task {
            BackupManager.autoBackupIfNeeded(
                context: modelContext,
                enabled: autoBackupEnabled,
                lastBackupDay: lastAutoBackupDay,
                updateLastBackupDay: { lastAutoBackupDay = $0 },
                updateLastFilename: { lastAutoBackupFilename = $0 }
            )
        }
    }
}

enum TabItem: String, CaseIterable {
    case log = "Log"
    case history = "History"
    case summary = "Summary"
    case settings = "Data"
    
    var icon: String {
        switch self {
        case .log: return "plus.circle.fill"
        case .history: return "clock.fill"
        case .summary: return "chart.bar.fill"
        case .settings: return "shield.fill"
        }
    }
}

struct FloatingTabBar: View {
    @Binding var selected: TabItem
    @Namespace private var ns
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(TabItem.allCases, id: \.self) { tab in
                Button {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                        selected = tab
                    }
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 24))
                            .symbolEffect(.bounce, value: selected == tab)
                        
                        if selected == tab {
                            Text(tab.rawValue)
                                .font(DesignSystem.font(.caption2, weight: .bold))
                                .transition(.move(edge: .bottom).combined(with: .opacity))
                        }
                    }
                    .foregroundStyle(selected == tab ? DesignSystem.accent : .white.opacity(0.4))
                    .frame(maxWidth: .infinity)
                    .frame(height: 64)
                    .background {
                        if selected == tab {
                            Capsule()
                                .fill(Color.white.opacity(0.1))
                                .matchedGeometryEffect(id: "bg", in: ns)
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 6)
        .background(.ultraThinMaterial, in: Capsule())
        .overlay(
            Capsule()
                .strokeBorder(
                    LinearGradient(
                        colors: [.white.opacity(0.2), .white.opacity(0.05)],
                        startPoint: .top,
                        endPoint: .bottom
                    ),
                    lineWidth: 1
                )
        )
        .shadow(color: Color.black.opacity(0.3), radius: 20, x: 0, y: 10)
        .padding(.horizontal, 20)
    }
}

#Preview {
    ContentView()
}
