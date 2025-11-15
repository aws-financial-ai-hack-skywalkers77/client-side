import { Grid3x3 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type WorkflowDiagramProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WorkflowDiagram({ open, onOpenChange }: WorkflowDiagramProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Compliance Workflow Process</DialogTitle>
          <DialogDescription>
            Visual representation of the automated compliance evaluation workflow
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6 px-4">
          <div className="relative h-[500px] bg-muted/10 rounded-lg p-6 overflow-hidden">
            {/* Step 1: Invoice Upload (Source) - Left */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10">
              <div className="relative">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  → SOURCE
                </div>
                <div className="bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 shadow-sm min-w-[140px] flex items-center gap-2.5">
                  <Grid3x3 className="w-4 h-4 text-slate-500 dark:text-slate-400" strokeWidth={2} />
                  <span className="font-semibold text-sm text-foreground">Invoice Upload</span>
                  <span className="ml-auto text-xs font-medium text-muted-foreground">0</span>
                </div>
              </div>
            </div>

            {/* Connection 1: Invoice Upload -> Document Analysis */}
            <svg className="absolute left-[170px] top-1/2 -translate-y-1/2 w-24 h-0.5 pointer-events-none" style={{ zIndex: 1 }}>
              <line x1="0" y1="0" x2="100%" y2="0" stroke="#374151" strokeWidth="3" markerEnd="url(#arrow-main-1)" />
              <defs>
                <marker id="arrow-main-1" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="#374151" />
                </marker>
              </defs>
            </svg>

            {/* Step 2: Document Analysis */}
            <div className="absolute left-[320px] top-1/2 -translate-y-1/2 z-10">
              <div className="relative">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 text-center">
                  → STAGE
                </div>
                <div className="bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-lg px-3 py-2.5 shadow-sm min-w-[150px] flex items-center gap-2.5">
                  <Grid3x3 className="w-4 h-4 text-blue-500" strokeWidth={2} />
                  <span className="font-semibold text-sm text-foreground">Document Analysis</span>
                  <span className="ml-auto text-xs font-medium text-muted-foreground">0</span>
                </div>
              </div>
            </div>

            {/* Connection 2: Document Analysis -> Rule Evaluation */}
            <svg className="absolute left-[490px] top-1/2 -translate-y-1/2 w-24 h-0.5 pointer-events-none" style={{ zIndex: 1 }}>
              <line x1="0" y1="0" x2="100%" y2="0" stroke="#374151" strokeWidth="3" markerEnd="url(#arrow-main-2)" />
              <defs>
                <marker id="arrow-main-2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="#374151" />
                </marker>
              </defs>
            </svg>

            {/* Step 3: Rule Evaluation */}
            <div className="absolute left-[640px] top-1/2 -translate-y-1/2 z-10">
              <div className="relative">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 text-center">
                  → STAGE
                </div>
                <div className="bg-white dark:bg-slate-800 border-2 border-orange-500 rounded-lg px-3 py-2.5 shadow-sm min-w-[150px] flex items-center gap-2.5">
                  <Grid3x3 className="w-4 h-4 text-orange-500" strokeWidth={2} />
                  <span className="font-semibold text-sm text-foreground">Rule Evaluation</span>
                  <span className="ml-auto text-xs font-medium text-muted-foreground">0</span>
                </div>
              </div>
            </div>

            {/* Connection 3: Rule Evaluation -> Violation Detection */}
            <svg className="absolute left-[810px] top-1/2 -translate-y-1/2 w-24 h-0.5 pointer-events-none" style={{ zIndex: 1 }}>
              <line x1="0" y1="0" x2="100%" y2="0" stroke="#374151" strokeWidth="3" markerEnd="url(#arrow-main-3)" />
              <defs>
                <marker id="arrow-main-3" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="#374151" />
                </marker>
              </defs>
            </svg>

            {/* Step 4: Violation Detection */}
            <div className="absolute left-[960px] top-1/2 -translate-y-1/2 z-10">
              <div className="relative">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 text-center">
                  → STAGE
                </div>
                <div className="bg-white dark:bg-slate-800 border-2 border-red-500 rounded-lg px-3 py-2.5 shadow-sm min-w-[160px] flex items-center gap-2.5">
                  <Grid3x3 className="w-4 h-4 text-red-500" strokeWidth={2} />
                  <span className="font-semibold text-sm text-foreground">Violation Detection</span>
                  <span className="ml-auto text-xs font-medium text-muted-foreground">0</span>
                </div>
              </div>
            </div>

            {/* Y-shaped Connection: Violation Detection -> Has Violations / No Violations */}
            <svg 
              className="absolute left-[1140px] top-0 h-full pointer-events-none" 
              style={{ width: '200px', zIndex: 1 }}
            >
              {/* Top curved path: Violation Detection -> Has Violations */}
              <path
                d="M 0 250 Q 70 200, 140 160"
                stroke="#374151"
                strokeWidth="3"
                fill="none"
                markerEnd="url(#arrow-y-top)"
              />
              {/* Bottom curved path: Violation Detection -> No Violations */}
              <path
                d="M 0 250 Q 70 300, 140 340"
                stroke="#374151"
                strokeWidth="3"
                fill="none"
                markerEnd="url(#arrow-y-bottom)"
              />
              <defs>
                <marker id="arrow-y-top" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="#374151" />
                </marker>
                <marker id="arrow-y-bottom" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="#374151" />
                </marker>
              </defs>
            </svg>

            {/* Condition Nodes: Has Violations / No Violations */}
            <div className="absolute left-[1370px] top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-16 z-10">
              {/* Top Condition: Has Violations */}
              <div className="relative">
                <div className="bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 shadow-sm whitespace-nowrap">
                  <span className="text-xs text-foreground">
                    Has <span className="bg-red-500 text-white px-2 py-0.5 rounded font-semibold ml-1">Violations</span>
                  </span>
                </div>
                {/* Connection to Risk Assessment */}
                <svg className="absolute left-full top-1/2 w-32 h-0.5" style={{ marginLeft: '10px', zIndex: 1 }}>
                  <line x1="0" y1="0" x2="100%" y2="0" stroke="#374151" strokeWidth="3" markerEnd="url(#arrow-to-risk-1)" />
                  <defs>
                    <marker id="arrow-to-risk-1" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                      <polygon points="0 0, 10 3, 0 6" fill="#374151" />
                    </marker>
                  </defs>
                </svg>
              </div>

              {/* Bottom Condition: No Violations */}
              <div className="relative">
                <div className="bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 shadow-sm whitespace-nowrap">
                  <span className="text-xs text-foreground">
                    No <span className="bg-green-500 text-white px-2 py-0.5 rounded font-semibold ml-1">Violations</span>
                  </span>
                </div>
                {/* Connection to Risk Assessment */}
                <svg className="absolute left-full top-1/2 w-32 h-0.5" style={{ marginLeft: '10px', zIndex: 1 }}>
                  <line x1="0" y1="0" x2="100%" y2="0" stroke="#374151" strokeWidth="3" markerEnd="url(#arrow-to-risk-2)" />
                  <defs>
                    <marker id="arrow-to-risk-2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                      <polygon points="0 0, 10 3, 0 6" fill="#374151" />
                    </marker>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Step 5: Risk Assessment - Right Side */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10">
              <div className="relative">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 text-right">
                  → STAGE
                </div>
                <div className="bg-white dark:bg-slate-800 border-2 border-purple-500 rounded-lg px-3 py-2.5 shadow-sm min-w-[160px] flex items-center gap-2.5">
                  <Grid3x3 className="w-4 h-4 text-purple-500" strokeWidth={2} />
                  <span className="font-semibold text-sm text-foreground">Risk Assessment</span>
                  <span className="ml-auto text-xs font-medium text-muted-foreground">0</span>
                </div>
              </div>
            </div>

            {/* Connection: Risk Assessment -> Report Generation (vertical down) */}
            <svg className="absolute right-[85px] top-full w-0.5 h-12 pointer-events-none" style={{ marginTop: '10px', zIndex: 1 }}>
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#374151" strokeWidth="3" markerEnd="url(#arrow-to-report)" />
              <defs>
                <marker id="arrow-to-report" markerWidth="10" markerHeight="10" refX="5" refY="9" orient="auto">
                  <polygon points="0 0, 10 10, 0 10" fill="#374151" />
                </marker>
              </defs>
            </svg>

            {/* Step 6: Report Generation - Bottom Right */}
            <div className="absolute right-6 bottom-6 z-10">
              <div className="relative">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 text-right">
                  → STAGE
                </div>
                <div className="bg-white dark:bg-slate-800 border-2 border-green-500 rounded-lg px-3 py-2.5 shadow-sm min-w-[180px] flex items-center gap-2.5">
                  <Grid3x3 className="w-4 h-4 text-green-500" strokeWidth={2} />
                  <span className="font-semibold text-sm text-foreground">Report Generation</span>
                  <span className="ml-auto text-xs font-medium text-muted-foreground">0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Legend/Summary */}
          <div className="mt-6 bg-muted/50 border border-border rounded-lg p-4">
            <h4 className="font-semibold mb-3 text-foreground">Workflow Process</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <div className="space-y-1">
                <p className="font-medium text-foreground text-xs">1. Invoice Upload</p>
                <p className="text-muted-foreground text-xs">Documents are uploaded and processed</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground text-xs">2. Document Analysis</p>
                <p className="text-muted-foreground text-xs">AI extracts and analyzes invoice fields</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground text-xs">3. Rule Evaluation</p>
                <p className="text-muted-foreground text-xs">Compliance rules checked against contracts</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground text-xs">4. Violation Detection</p>
                <p className="text-muted-foreground text-xs">Identifies rule violations and issues</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground text-xs">5. Risk Assessment</p>
                <p className="text-muted-foreground text-xs">Calculates risk percentage (Good/Low/Medium/High)</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground text-xs">6. Report Generation</p>
                <p className="text-muted-foreground text-xs">Comprehensive PDF with all findings</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
