import Link from 'next/link'

export default function Home() {
  const features = [
    {
      title: '📹 Bodycam Commands',
      description: 'Quick access to roleplay commands for all LEO organizations with customizable org selection.',
      link: '/bodycam-commands',
    },
    {
      title: '📚 Patrolman\'s Guide',
      description: 'Complete law reference with search, filtering, and charge collection. Track selected charges for evidence reports.',
      link: '/patrolman-guide',
    },
    {
      title: '📝 Reports',
      description: 'Generate evidence reports and shift reports. Track arrests, fines, and duty hours automatically.',
      link: '/reports',
    },
    {
      title: '👤 Profile',
      description: 'View your duty logs, performance statistics, and shift history with detailed breakdowns.',
      link: '/profile',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-4">
          Grand RP LEO Toolkit
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
          Your comprehensive toolkit for Law Enforcement roleplay in Grand RP
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Real-time Duty Tracking
          </span>
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Theme Support
          </span>
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Performance Stats
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {features.map((feature) => (
          <Link
            key={feature.title}
            href={feature.link}
            className="card p-6 hover:shadow-xl hover:scale-105 transition-all duration-200 group"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {feature.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
          </Link>
        ))}
      </div>

      <div className="card p-6 text-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-2 border-blue-200 dark:border-blue-800">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Ready to get started?</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Start tracking your duty, generate reports, and access all LEO tools in one place.
        </p>
        <Link href="/reports" className="btn btn-primary inline-block">
          Start Your Duty
        </Link>
      </div>
    </div>
  )
}
