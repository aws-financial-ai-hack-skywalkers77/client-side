// Import the logo image (you'll need to add your logo file to src/assets/)
// import logoIcon from "@/assets/docuflow-logo.png" // or .svg, .jpg, etc.

export function Logo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        {/* Option 1: Using an image file - uncomment when you add the image */}
        {/* 
        <img 
          src={logoIcon} 
          alt="DocuFlow Logo" 
          className="h-11 w-auto"
        />
        <span className="text-2xl font-bold text-white tracking-tight drop-shadow-sm">
          DocuFlow
        </span>
        */}
        
        {/* Option 2: Using SVG (current) - comment out when using image above */}
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#FF9900] bg-transparent shadow-lg">
          <svg
            width="38"
            height="38"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-lg"
          >
            {/* Main document shape - prominent orange */}
            <path
              d="M6.5 4.5C6.5 3.94772 6.94772 3.5 7.5 3.5H12.0858C12.351 3.5 12.6054 3.60536 12.7929 3.79289L15.7071 6.70711C15.8946 6.89464 16 7.149 16 7.41421V15.5C16 16.0523 15.5523 16.5 15 16.5H7.5C6.94772 16.5 6.5 16.0523 6.5 15.5V4.5Z"
              fill="#FF9900"
              stroke="#FF9900"
              strokeWidth="0.8"
            />
            {/* Folded/torn corner at bottom-right - prominent */}
            <path
              d="M15 16.5L17.8 18.5L15 20.5L12.2 18.5Z"
              fill="#FF9900"
              fillOpacity="1"
              stroke="#FF9900"
              strokeWidth="0.5"
            />
            {/* Inner fold line for depth - more visible */}
            <path
              d="M15 16.5L17 18L15 19.5"
              stroke="white"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0.7"
            />
            {/* Three horizontal lines at the top - bolder and more visible */}
            <line 
              x1="9" 
              y1="8.5" 
              x2="13.5" 
              y2="8.5" 
              stroke="white" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              opacity="0.95"
            />
            <line 
              x1="9" 
              y1="10.5" 
              x2="13" 
              y2="10.5" 
              stroke="white" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              opacity="0.95"
            />
            <line 
              x1="9" 
              y1="12.5" 
              x2="12" 
              y2="12.5" 
              stroke="white" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              opacity="0.95"
            />
            {/* Arrow from bottom-right corner - very bold */}
            <path
              d="M15 18L18 15L19.5 16.5"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Arrowhead - very bold */}
            <path
              d="M18 15L19.5 16.5L18 18"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
        <span className="text-2xl font-bold text-white tracking-tight drop-shadow-sm">
          DocuFlow
        </span>
      </div>
    </div>
  )
}
