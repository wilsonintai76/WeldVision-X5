import { useState } from 'react'
import { 
  BookOpen, 
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  Terminal,
  ExternalLink,
  Home,
  Keyboard,
  HelpCircle,
  Lightbulb
} from 'lucide-react'

function Help() {
  const [expandedSections, setExpandedSections] = useState({
    shortcuts: true,
    workflow: false,
    troubleshooting: false
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Quick Help</h1>
                <p className="text-slate-400">Essential tips and shortcuts</p>
              </div>
            </div>
            <a
              href="/"
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              <Home className="w-4 h-4" />
              Full Documentation
            </a>
          </div>
        </div>

        {/* Quick Tips Banner */}
        <div className="bg-gradient-to-r from-emerald-900/30 to-blue-900/30 border border-emerald-600/30 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Lightbulb className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">New to WeldVision X5?</h2>
              <p className="text-slate-300 text-sm mb-3">
                Visit the landing page for comprehensive setup guides, prerequisites, and documentation.
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium"
              >
                Go to Welcome Page
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Documentation Sections */}
        <div className="space-y-4">
          {/* Shortcuts & Navigation */}
          <Section
            title="Shortcuts & Navigation"
            icon={<Keyboard className="w-5 h-5" />}
            expanded={expandedSections.shortcuts}
            onToggle={() => toggleSection('shortcuts')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <ShortcutCard
                  title="Live Monitoring"
                  description="View real-time camera feed with AI detections"
                  location="Top of sidebar"
                />
                <ShortcutCard
                  title="MLOps Studio"
                  description="Upload data, annotate, train models"
                  location="Sidebar → MLOps Studio"
                />
                <ShortcutCard
                  title="Edge Management"
                  description="Monitor and deploy to RDK X5 devices"
                  location="Sidebar → System → Edge Management"
                />
                <ShortcutCard
                  title="Student Reports"
                  description="Generate evaluation PDFs"
                  location="Dashboard → Select Student → Download"
                />
              </div>
            </div>
          </Section>

          {/* MLOps Workflow */}
          <Section
            title="MLOps Workflow Summary"
            icon={<ChevronRight className="w-5 h-5" />}
            expanded={expandedSections.workflow}
            onToggle={() => toggleSection('workflow')}
          >
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between text-sm">
                  <WorkflowStep number={1} title="Upload Data" />
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                  <WorkflowStep number={2} title="Annotate" />
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                  <WorkflowStep number={3} title="Train" />
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                  <WorkflowStep number={4} title="Convert" />
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                  <WorkflowStep number={5} title="Deploy" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                  <p className="text-white font-medium text-sm mb-1">Local Training</p>
                  <p className="text-xs text-slate-400">Requires NVIDIA GPU with 6GB+ VRAM</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                  <p className="text-white font-medium text-sm mb-1">Cloud Training</p>
                  <p className="text-xs text-slate-400">Use Colab, Roboflow, or Ultralytics HUB</p>
                </div>
              </div>
            </div>
          </Section>

          {/* Quick Troubleshooting */}
          <Section
            title="Common Issues"
            icon={<AlertCircle className="w-5 h-5" />}
            expanded={expandedSections.troubleshooting}
            onToggle={() => toggleSection('troubleshooting')}
          >
            <div className="space-y-3">
              <TroubleshootItem
                issue="Backend not accessible"
                solution="Run: docker-compose ps to check if containers are running"
              />
              <TroubleshootItem
                issue="Edge device not detected"
                solution="Check RDK X5 is on same network, verify weldvision service is running"
              />
              <TroubleshootItem
                issue="Training fails to start"
                solution="Check system hardware requirements or use cloud training option"
              />
              <TroubleshootItem
                issue="Camera feed not showing"
                solution="Verify stereo calibration is complete and cameras are connected"
              />
            </div>
            
            <div className="mt-4 bg-slate-800 border border-slate-700 rounded-lg p-4">
              <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                View Logs
              </h4>
              <code className="block bg-slate-900 text-slate-300 text-xs p-3 rounded font-mono">
                docker-compose logs -f backend
              </code>
            </div>
          </Section>
        </div>

        {/* External Resources */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          <ResourceLink
            title="Quick Start"
            href="https://github.com/wilsonintai76/WeldVision-X5/blob/main/docs/QUICKSTART.md"
          />
          <ResourceLink
            title="Prerequisites"
            href="https://github.com/wilsonintai76/WeldVision-X5/blob/main/docs/PREREQUISITES.md"
          />
          <ResourceLink
            title="Deployment"
            href="https://github.com/wilsonintai76/WeldVision-X5/blob/main/docs/DEPLOYMENT.md"
          />
          <ResourceLink
            title="GitHub"
            href="https://github.com/wilsonintai76/WeldVision-X5"
          />
        </div>
      </div>
    </div>
  )
}

// Helper Components
function Section({ title, icon, expanded, onToggle, children }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-blue-400">{icon}</div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
        </div>
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400" />
        )}
      </button>
      {expanded && (
        <div className="p-6 border-t border-slate-700">
          {children}
        </div>
      )}
    </div>
  )
}

function ShortcutCard({ title, description, location }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <h4 className="text-white font-semibold text-sm mb-1">{title}</h4>
      <p className="text-slate-400 text-xs mb-2">{description}</p>
      <p className="text-blue-400 text-xs flex items-center gap-1">
        <ChevronRight className="w-3 h-3" />
        {location}
      </p>
    </div>
  )
}

function WorkflowStep({ number, title }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
        {number}
      </div>
      <span className="text-slate-300 text-sm">{title}</span>
    </div>
  )
}

function TroubleshootItem({ issue, solution }) {
  return (
    <div className="flex items-start gap-3 bg-slate-800/50 border border-slate-700 rounded-lg p-3">
      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-white text-sm font-medium">{issue}</p>
        <p className="text-slate-400 text-xs mt-1">{solution}</p>
      </div>
    </div>
  )
}

function ResourceLink({ title, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-3 transition-colors group"
    >
      <ExternalLink className="w-4 h-4 text-blue-400" />
      <span className="text-white text-sm font-medium">{title}</span>
    </a>
  )
}

export default Help


