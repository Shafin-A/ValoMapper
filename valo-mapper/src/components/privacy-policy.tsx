export const PrivacyPolicy = () => {
  return (
    <div className="space-y-6 text-muted-foreground">
      <div className="text-sm text-muted-foreground/80">
        <strong>Last Updated:</strong> Dec 2nd, 2025
      </div>

      <p>
        ValoMapper (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is a
        free website that helps players create and share strategies for
        VALORANT. This Privacy Policy explains what information we collect, how
        we use it, and the choices you have.
      </p>

      <p>
        By using ValoMapper, you agree to the terms described in this Privacy
        Policy.
      </p>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">1. Information We Collect</h3>

        <div>
          <h4 className="font-semibold mb-2">1.1 Information You Provide</h4>

          <p className="font-semibold mb-1">Account Information</p>
          <p className="mb-2">
            If you choose to create an account, we collect:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4 mb-3">
            <li>Username</li>
            <li>Email address</li>
            <li>Password (securely hashed via Firebase Authentication)</li>
          </ul>
          <p className="mb-3">
            Your email and authentication credentials are stored in Firebase
            Authentication. We also maintain a reference to your account in our
            PostgreSQL database, which includes your username, user ID, Firebase
            ID, email address, email verification status, and account
            creation/update timestamps.
          </p>

          <p className="font-semibold mb-1">Strategy Content</p>
          <p className="mb-2">
            When you create strategies in lobbies, we store:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4 mb-3">
            <li>Images</li>
            <li>Text annotations</li>
            <li>Drawings</li>
            <li>Any other content added to the strategy canvas</li>
          </ul>

          <p className="font-semibold mb-1">Lobby Sharing</p>
          <p>
            Lobbies are accessible via unique URLs. Anyone with a lobby URL can
            view and edit the strategies within that lobby. If you share a lobby
            URL, the content becomes accessible to anyone who has the link.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">
            1.2 Information Collected Automatically
          </h4>
          <p className="mb-2">
            When you visit ValoMapper, we may automatically collect basic
            technical information, including:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4 mb-3">
            <li>Browser type and version</li>
            <li>Device information</li>
            <li>
              IP address (used temporarily for rate limiting and security
              purposes, not stored long-term)
            </li>
            <li>General usage data</li>
            <li>Error logs (e.g., failed API calls, server errors)</li>
          </ul>
          <p>
            We use this information to maintain, secure, and improve the
            website. We do not currently use Google Analytics or similar
            third-party analytics services.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">2. Cookies</h3>
        <p className="mb-2">
          ValoMapper uses minimal cookies for essential functionality, such as:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4 mb-3">
          <li>Session management</li>
          <li>
            Temporary notification messages (e.g., success toasts after actions)
          </li>
          <li>Authentication state</li>
        </ul>
        <p>
          You can disable cookies in your browser settings, but this may prevent
          certain features from working correctly.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">
          3. How We Use Your Information
        </h3>
        <p className="mb-2">We use collected information to:</p>
        <ul className="list-disc list-inside space-y-1 ml-4 mb-3">
          <li>Provide, maintain, and improve ValoMapper</li>
          <li>Manage user accounts and authentication</li>
          <li>Save and load user-created strategies and lobbies</li>
          <li>Diagnose errors and monitor site performance</li>
          <li>
            Send account-related communications (such as email verification via
            Firebase)
          </li>
          <li>Implement security measures and rate limiting</li>
        </ul>
        <p className="font-semibold">
          We do not sell, rent, or trade your personal information to third
          parties.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">4. Sharing of Information</h3>
        <p>
          We may share information only in the following limited circumstances:
        </p>

        <div>
          <p className="font-semibold mb-1">Public Lobbies</p>
          <p className="mb-3">
            Strategies created in lobbies are accessible to anyone with the
            lobby URL. By sharing a lobby link, you are making that content
            publicly accessible.
          </p>

          <p className="font-semibold mb-1">Service Providers</p>
          <p className="mb-2">
            We use trusted third-party services to operate ValoMapper:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4 mb-3">
            <li>
              <strong>Firebase Authentication</strong> (Google) - for user
              authentication and account management
            </li>
            <li>
              <strong>PostgreSQL Database</strong> (hosted service TBD) - for
              storing user references and lobby data
            </li>
            <li>
              <strong>Cloud Hosting Provider</strong> (TBD) - for website
              hosting and infrastructure
            </li>
          </ul>
          <p className="mb-3">
            These providers have access only to information necessary to perform
            their services and are obligated to protect your data.
          </p>

          <p className="font-semibold mb-1">Legal Requirements</p>
          <p>
            We may disclose information if required by law, such as to comply
            with a subpoena, court order, or other legal process, or to protect
            the rights, property, or safety of ValoMapper, our users, or others.
          </p>
        </div>

        <p>
          We do not work with advertising networks or third-party marketers.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">5. Email Communications</h3>
        <p className="mb-2">
          We may send you emails related to your account, including:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4 mb-3">
          <li>Email verification</li>
          <li>Password reset requests</li>
          <li>
            Important notices about your account or significant changes to
            ValoMapper
          </li>
        </ul>
        <p>
          We do not send promotional emails, newsletters, or marketing
          communications.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">6. Children&apos;s Privacy</h3>
        <p>
          ValoMapper is intended for players aged 16 and older, in alignment
          with VALORANT&apos;s age rating. We do not knowingly collect personal
          information from children under 13 (or under 16 in jurisdictions where
          required).
        </p>
        <p>
          We do not have automated age verification mechanisms in place. If you
          believe a child has provided personal information to ValoMapper,
          please contact us at valomapper@gmail.com and we will promptly
          investigate and delete such information.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">
          7. Data Retention and Account Deletion
        </h3>

        <div>
          <p className="font-semibold mb-1">Active Accounts</p>
          <p className="mb-3">
            We retain your account information and associated lobbies for as
            long as your account remains active.
          </p>

          <p className="font-semibold mb-1">Account Deletion</p>
          <p className="mb-2">
            You can delete your account at any time through your account
            settings. When you delete your account:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4 mb-3">
            <li>
              Your account information will be permanently removed from our
              systems
            </li>
            <li>
              Lobbies you created will become &quot;unclaimed&quot; and will
              persist temporarily but may be deleted during routine cleanup
              (approximately every 12 hours)
            </li>
            <li>Other users can save unclaimed lobbies to preserve them</li>
            <li>
              Lobbies you shared remain accessible via their URLs until they are
              deleted or expire
            </li>
          </ul>

          <p className="font-semibold mb-1">Lobby Cleanup</p>
          <p>
            Unclaimed lobbies (those without an associated active account) are
            subject to periodic cleanup and may be automatically deleted during
            maintenance sweeps.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">8. Your Rights and Choices</h3>
        <p className="mb-2">
          Depending on your location, you may have certain rights regarding your
          personal information, including:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4 mb-3">
          <li>
            <strong>Access:</strong> Request a copy of the personal information
            we hold about you
          </li>
          <li>
            <strong>Correction:</strong> Update or correct your account
            information
          </li>
          <li>
            <strong>Deletion:</strong> Request deletion of your account and
            associated data
          </li>
          <li>
            <strong>Portability:</strong> Request your data in a structured,
            commonly used format (where applicable)
          </li>
        </ul>
        <p>
          To exercise these rights, contact us at valomapper@gmail.com. We will
          respond to valid requests within a reasonable timeframe as required by
          applicable law.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">9. Security</h3>
        <p className="mb-2">
          We take reasonable measures to protect your information, including:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4 mb-3">
          <li>
            Using Firebase Authentication for secure password storage and
            management
          </li>
          <li>Encrypted connections (HTTPS) for all data transmission</li>
          <li>Secure database storage practices</li>
          <li>Rate limiting and monitoring for suspicious activity</li>
        </ul>
        <p className="mb-3">
          However, no method of transmission over the internet or electronic
          storage is 100% secure. While we strive to protect your personal
          information, we cannot guarantee absolute security.
        </p>

        <p className="font-semibold mb-1">Data Breach Notification</p>
        <p>
          In the event of a security breach that affects your personal
          information, we will notify you via email and/or a prominent notice on
          the ValoMapper website as required by applicable law.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">
          10. International Users and Data Transfers
        </h3>
        <p>
          ValoMapper is operated from Canada. If you are accessing ValoMapper
          from outside Canada, please be aware that your information may be
          transferred to, stored, and processed in Canada or other countries
          where our service providers operate. By using ValoMapper, you consent
          to the transfer of your information to countries outside your country
          of residence, which may have different data protection laws.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">
          11. Changes to This Privacy Policy
        </h3>
        <p>
          We may update this Privacy Policy from time to time to reflect changes
          in our practices, technology, legal requirements, or other factors.
          When we make changes, we will update the &quot;Last Updated&quot; date
          at the top of this policy.
        </p>
        <p>
          If we make material changes, we may notify you by email or through a
          prominent notice on the website. We encourage you to review this
          Privacy Policy periodically to stay informed about how we protect your
          information.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">12. Contact Us</h3>
        <p>
          If you have questions, concerns, or requests regarding this Privacy
          Policy or your personal information, please contact us at:
        </p>
        <p className="font-semibold">valomapper@gmail.com</p>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">13. Legal Compliance</h3>
        <p className="mb-2">
          This Privacy Policy is designed to comply with applicable privacy
          laws, including:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4 mb-3">
          <li>
            Canada&apos;s Personal Information Protection and Electronic
            Documents Act (PIPEDA)
          </li>
          <li>
            The EU General Data Protection Regulation (GDPR) where applicable
          </li>
          <li>The California Consumer Privacy Act (CCPA) where applicable</li>
        </ul>
        <p>
          If you believe your privacy rights have been violated, you may have
          the right to lodge a complaint with your local data protection
          authority.
        </p>
      </section>
    </div>
  );
};
