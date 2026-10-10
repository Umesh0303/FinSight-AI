import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, ArrowRight } from 'lucide-react';
import { PublicNav } from '../../components/layout/PublicNav';
import { PublicFooter } from '../../components/layout/PublicFooter';
import { FinancialBackground } from '../../components/brand/FinancialBackground';

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <FinancialBackground variant="features" className="min-h-screen text-white flex flex-col selection:bg-[#deb03e] selection:text-black">
      <PublicNav />

      {/* Header Banner */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-[#e5b842] bg-[#052b1e] px-4 py-1.5 rounded-full border border-[#0d4f38]">
          Connect With FinSight AI
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold font-heading text-white mt-4 tracking-tight">
          Institutional Inquiries & Telemetry Access
        </h1>
        <p className="text-sm sm:text-base text-[#8cb8a7] max-w-xl mx-auto mt-4 font-light leading-relaxed">
          Request an enterprise technical walkthrough of our multi-tenant fintech intelligence architecture.
        </p>
      </section>

      {/* Main Content Area */}
      <section className="py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-16">
          {/* Contact Details */}
          <div className="md:col-span-5 p-8 rounded-3xl bg-[#052b1e]/90 border border-[#0d4f38] shadow-xl space-y-6">
            <div>
              <h3 className="font-heading font-bold text-xl text-white">Direct Channels</h3>
              <p className="text-xs text-[#8cb8a7] mt-1">Our platform engineers respond within 24 business hours.</p>
            </div>

            <div className="space-y-4 text-xs text-[#8cb8a7]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#031d14] border border-[#0d4f38] text-[#10b981] flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-white block font-semibold text-xs">Technical Contact</span>
                  <span>enterprise@finsight.ai</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#031d14] border border-[#0d4f38] text-[#e5b842] flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-white block font-semibold text-xs">Security Hotdesk</span>
                  <span>+91 80 4192 8800</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#031d14] border border-[#0d4f38] text-[#38bdf8] flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-white block font-semibold text-xs">Financial District Office</span>
                  <span>Outer Ring Road, Bengaluru 560103</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#093d2c] text-[11px] text-[#588574]">
              Zero-Trust Architecture · SOC2 Type II Certified · Bank-Grade TLS
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-7 p-8 rounded-3xl bg-[#052b1e]/90 border border-[#0d4f38] shadow-xl">
            {submitted ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#083325] text-[#34d399] flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Inquiry Dispatched</h3>
                <p className="text-xs text-[#8cb8a7] max-w-sm mx-auto leading-relaxed">
                  Thank you. An institutional solutions architect will review your technical query and respond shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="font-heading font-bold text-xl text-white mb-2">Request Technical Demo</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#8cb8a7] mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Chandra"
                      className="w-full px-3.5 py-2.5 bg-[#031d14] border border-[#0d4f38] rounded-xl text-xs text-white placeholder-[#457261] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#8cb8a7] mb-1">Institutional Email</label>
                    <input
                      type="email"
                      required
                      placeholder="r.chandra@bank.com"
                      className="w-full px-3.5 py-2.5 bg-[#031d14] border border-[#0d4f38] rounded-xl text-xs text-white placeholder-[#457261] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8cb8a7] mb-1">Organization / Department</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Risk Oversight, National Banking Corp"
                    className="w-full px-3.5 py-2.5 bg-[#031d14] border border-[#0d4f38] rounded-xl text-xs text-white placeholder-[#457261] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8cb8a7] mb-1">Message or Scope of Review</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your review timeline or multi-tenant deployment questions..."
                    className="w-full px-3.5 py-2.5 bg-[#031d14] border border-[#0d4f38] rounded-xl text-xs text-white placeholder-[#457261] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#ecc866] via-[#e5b842] to-[#d69f2e] hover:from-[#f3da87] hover:to-[#dfab38] text-[#052419] font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Technical Inquiry</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <PublicFooter />
    </FinancialBackground>
  );
};
