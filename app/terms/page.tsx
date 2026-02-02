import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | ServiceFlow",
  description:
    "Read the terms and conditions for using ServiceFlow booking management platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <article className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-8 md:p-12">
          <header className="mb-10 pb-8 border-b border-zinc-100">
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-3">
              Terms of Service
            </h1>
            <p className="text-zinc-500">Last updated: February 3, 2026</p>
          </header>

          <div className="prose prose-zinc max-w-none prose-headings:font-semibold prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-p:text-zinc-600 prose-li:text-zinc-600">
            <p>
              Welcome to ServiceFlow. These Terms of Service ("Terms") govern
              your access to and use of our booking management platform,
              including our website, applications, and services (collectively,
              the "Service"). By accessing or using ServiceFlow, you agree to be
              bound by these Terms.
            </p>

            <h2>1. Acceptance of Terms</h2>
            <p>
              By creating an account or using our Service, you acknowledge that
              you have read, understood, and agree to be bound by these Terms
              and our Privacy Policy. If you do not agree to these Terms, you
              may not use the Service.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              ServiceFlow is a cloud-based booking and service management
              platform that allows businesses to:
            </p>
            <ul>
              <li>Manage service offerings and pricing</li>
              <li>Accept and manage customer bookings</li>
              <li>Track employee schedules and attendance</li>
              <li>Process payments and generate reports</li>
              <li>Communicate with customers via automated notifications</li>
            </ul>

            <h2>3. User Accounts</h2>
            <p>
              To use ServiceFlow, you must create an account. You are
              responsible for:
            </p>
            <ul>
              <li>
                Providing accurate and complete information during registration
              </li>
              <li>Maintaining the security of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>
                Notifying us immediately of any unauthorized use of your account
              </li>
            </ul>
            <p>
              You must be at least 18 years old to create an account and use our
              Service.
            </p>

            <h2>4. Business Owner Responsibilities</h2>
            <p>As a business owner using ServiceFlow, you agree to:</p>
            <ul>
              <li>
                Provide accurate information about your business and services
              </li>
              <li>Honor bookings made through the platform</li>
              <li>
                Maintain appropriate licenses and permits for your business
              </li>
              <li>
                Comply with all applicable laws and regulations in your
                jurisdiction
              </li>
              <li>
                Handle customer data in accordance with applicable privacy laws
              </li>
              <li>Respond to customer inquiries in a timely manner</li>
            </ul>

            <h2>5. Customer Booking Terms</h2>
            <p>When making a booking through ServiceFlow:</p>
            <ul>
              <li>You agree to provide accurate contact information</li>
              <li>
                You understand that bookings are subject to the business's
                cancellation policy
              </li>
              <li>
                You acknowledge that service prices and availability may change
              </li>
              <li>You agree to arrive on time for scheduled appointments</li>
            </ul>

            <h2>6. Payment Terms</h2>
            <p>
              Payment processing is handled through third-party payment
              processors. By using our payment features, you agree to:
            </p>
            <ul>
              <li>Pay all fees associated with your subscription plan</li>
              <li>
                Provide valid payment information and authorize recurring
                charges
              </li>
              <li>
                Accept that subscription fees are billed in advance on a monthly
                or annual basis
              </li>
              <li>Understand that refunds are subject to our refund policy</li>
            </ul>

            <h2>7. Prohibited Uses</h2>
            <p>You agree not to use the Service to:</p>
            <ul>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on the intellectual property rights of others</li>
              <li>Transmit harmful code, viruses, or malicious software</li>
              <li>
                Attempt to gain unauthorized access to our systems or networks
              </li>
              <li>
                Engage in fraudulent activities or misrepresent your identity
              </li>
              <li>Harass, abuse, or harm other users or businesses</li>
              <li>Use the Service for any illegal or unauthorized purpose</li>
            </ul>

            <h2>8. Intellectual Property</h2>
            <p>
              ServiceFlow and its original content, features, and functionality
              are owned by ServiceFlow and are protected by international
              copyright, trademark, and other intellectual property laws. You
              may not reproduce, distribute, modify, or create derivative works
              without our express written consent.
            </p>

            <h2>9. Data and Privacy</h2>
            <p>
              Your use of the Service is also governed by our Privacy Policy.
              You acknowledge that:
            </p>
            <ul>
              <li>
                We collect and process data as described in our Privacy Policy
              </li>
              <li>
                You are responsible for obtaining necessary consents from your
                customers
              </li>
              <li>
                We implement reasonable security measures to protect your data
              </li>
            </ul>

            <h2>10. Service Availability</h2>
            <p>
              We strive to maintain high availability of our Service, but we do
              not guarantee uninterrupted access. We may:
            </p>
            <ul>
              <li>Perform scheduled maintenance with reasonable notice</li>
              <li>Experience occasional downtime due to technical issues</li>
              <li>Modify or discontinue features with appropriate notice</li>
            </ul>

            <h2>11. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, ServiceFlow shall not be
              liable for any indirect, incidental, special, consequential, or
              punitive damages, including but not limited to loss of profits,
              data, or business opportunities, arising from your use of the
              Service.
            </p>

            <h2>12. Disclaimer of Warranties</h2>
            <p>
              The Service is provided "as is" and "as available" without any
              warranties of any kind, either express or implied, including but
              not limited to implied warranties of merchantability, fitness for
              a particular purpose, or non-infringement.
            </p>

            <h2>13. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless ServiceFlow, its
              affiliates, officers, directors, employees, and agents from any
              claims, damages, losses, or expenses arising from your use of the
              Service or violation of these Terms.
            </p>

            <h2>14. Termination</h2>
            <p>
              We may terminate or suspend your account at any time for
              violations of these Terms. You may cancel your account at any time
              through your account settings. Upon termination:
            </p>
            <ul>
              <li>Your access to the Service will be revoked</li>
              <li>
                We may retain certain data as required by law or for legitimate
                business purposes
              </li>
              <li>You remain responsible for any outstanding fees</li>
            </ul>

            <h2>15. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will
              notify you of material changes via email or through the Service.
              Your continued use of the Service after such modifications
              constitutes acceptance of the updated Terms.
            </p>

            <h2>16. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with
              the laws of the Philippines, without regard to its conflict of law
              provisions.
            </p>

            <h2>17. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us at:
            </p>
            <ul>
              <li>
                Email:{" "}
                <a
                  href="mailto:support@serviceflow.store"
                  className="text-emerald-600 hover:text-emerald-700"
                >
                  support@serviceflow.store
                </a>
              </li>
              <li>
                Website:{" "}
                <a
                  href="https://www.serviceflow.store"
                  className="text-emerald-600 hover:text-emerald-700"
                >
                  www.serviceflow.store
                </a>
              </li>
            </ul>
          </div>
        </article>

        <footer className="mt-8 text-center text-sm text-zinc-500">
          <p>
            See also:{" "}
            <Link
              href="/privacy"
              className="text-emerald-600 hover:text-emerald-700 underline"
            >
              Privacy Policy
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
