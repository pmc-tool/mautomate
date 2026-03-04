interface NavigationItem {
  name: string;
  href: string;
}

export default function Footer({
  footerNavigation,
}: {
  footerNavigation: {
    app: NavigationItem[];
    company: NavigationItem[];
  };
}) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="dark:bg-boxdark-2 mx-auto mt-6 max-w-7xl px-6 lg:px-8">
      <footer
        aria-labelledby="footer-heading"
        className="relative border-t border-gray-900/10 py-24 sm:mt-32 dark:border-gray-200/10"
      >
        <h2 id="footer-heading" className="sr-only">
          Footer
        </h2>
        <div className="mt-10 flex items-start justify-end gap-20">
          <div className="mr-auto max-w-sm">
            <p className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
              mAutomate.ai
            </p>
            <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
              AI marketing automation platform for campaign orchestration,
              audience segmentation, and attribution analytics.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
              App
            </h3>
            <ul role="list" className="mt-6 space-y-4">
              {footerNavigation.app.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-sm leading-6 text-gray-600 hover:text-gray-900 dark:text-white"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
              Company
            </h3>
            <ul role="list" className="mt-6 space-y-4">
              {footerNavigation.company.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-sm leading-6 text-gray-600 hover:text-gray-900 dark:text-white"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-14 border-t border-gray-900/10 pt-8 dark:border-gray-200/10">
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            © {currentYear} mAutomate.ai. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
