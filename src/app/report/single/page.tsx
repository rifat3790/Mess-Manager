"use client";

import { useAuth } from '@/context/AuthContext';
import { FileText, Loader2, Download, Printer, Trash2 } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { getDashboardData, removeMember } from '@/app/actions/dataActions';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { LedgerTable } from '@/components/LedgerTable';
import { toast } from 'react-hot-toast';
import { replaceOklchInString } from '@/lib/pdfHelper';

export default function SingleReportPage() {
  const { mongoUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!mongoUser?._id) return;
      const res = await getDashboardData(mongoUser._id);
      if (res.success) {
        setData(res);
      }
      setLoading(false);
    };
    if (mongoUser) {
      fetchData();
    }
  }, [mongoUser]);

  const handleRemoveMember = async (member: any) => {
    if (member.totalMeal > 0 || member.deposit > 0 || member.singleCost > 0 || (member.jointCost || 0) > 0) {
      const reasons = [];
      if (member.totalMeal > 0) reasons.push(`মিল (${member.totalMeal}টি)`);
      if (member.deposit > 0) reasons.push(`জমা (${member.deposit}৳)`);
      if (member.singleCost > 0) reasons.push(`একক খরচ (${member.singleCost}৳)`);
      if ((member.jointCost || 0) > 0) reasons.push(`যৌথ খরচ (${member.jointCost.toFixed(2)}৳)`);
      toast.error(`এই মেম্বারকে রিমুভ করা সম্ভব নয়। চলমান মাসে তার রেকর্ড রয়েছে — ${reasons.join(', ')}। মেম্বার ডিলিট করতে হলে সব রেকর্ড ০ (শূন্য) হতে হবে।`);
      return;
    }
    
    if (window.confirm(`আপনি কি নিশ্চিত যে আপনি ${member.name}-কে মেস থেকে এবং ডাটাবেস থেকে একেবারে মুছে ফেলতে চান?`)) {
      if (!mongoUser) return;
      const res = await removeMember(mongoUser._id, member._id);
      if (res.success) {
        toast.success(`${member.name}-কে সফলভাবে রিমুভ করা হয়েছে।`);
        // Refresh data
        setLoading(true);
        const newData = await getDashboardData(mongoUser._id);
        if (newData.success) setData(newData);
        setLoading(false);
      } else {
        toast.error('রিমুভ করতে সমস্যা হয়েছে: ' + res.error);
      }
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      setDownloading(true);
      
      const scrollPos = window.scrollY;
      window.scrollTo(0, 0);

      // 1. Clone the node and clean all inline style attributes
      const originalElement = reportRef.current;
      const clone = originalElement.cloneNode(true) as HTMLElement;
      
      // Copy exact dimensions and styling for rendering
      clone.style.width = originalElement.offsetWidth + 'px';
      clone.style.position = 'absolute';
      clone.style.top = '-9999px';
      clone.style.left = '-9999px';
      clone.style.background = '#ffffff';
      document.body.appendChild(clone);

      const cleanInlineStyles = (element: HTMLElement) => {
        const styleAttr = element.getAttribute('style');
        if (styleAttr) {
          let cleaned = replaceOklchInString(styleAttr);
          cleaned = cleaned.replace(/oklab\s*\([^)]+\)/gi, 'rgb(79, 70, 229)');
          element.setAttribute('style', cleaned);
        }
        Array.from(element.children).forEach(child => {
          if (child instanceof HTMLElement) {
            cleanInlineStyles(child);
          }
        });
      };
      cleanInlineStyles(clone);

      // 2. Gather all CSS rules from all active stylesheets
      let allCssText = '';
      const nodesToDisable: HTMLStyleElement[] = [];
      const linkTagsToDisable: HTMLLinkElement[] = [];

      for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i];
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (rules) {
            for (let j = 0; j < rules.length; j++) {
              allCssText += rules[j].cssText + '\n';
            }
            if (sheet.ownerNode instanceof HTMLStyleElement) {
              nodesToDisable.push(sheet.ownerNode);
            } else if (sheet.ownerNode instanceof HTMLLinkElement) {
              linkTagsToDisable.push(sheet.ownerNode);
            }
          }
        } catch (e) {
          // Fallback if CORS blocks direct rule access
          const ownerNode = sheet.ownerNode;
          if (ownerNode instanceof HTMLStyleElement) {
            allCssText += ownerNode.innerHTML + '\n';
            nodesToDisable.push(ownerNode);
          } else if (ownerNode instanceof HTMLLinkElement) {
            try {
              const href = ownerNode.href;
              if (href && href.startsWith(window.location.origin)) {
                const res = await fetch(href);
                if (res.ok) {
                  const text = await res.text();
                  allCssText += text + '\n';
                }
              }
            } catch (err) {}
            linkTagsToDisable.push(ownerNode);
          }
        }
      }

      // 3. Preprocess gathered styles
      let processedCss = replaceOklchInString(allCssText);
      processedCss = processedCss.replace(/oklab\s*\([^)]+\)/gi, 'rgb(79, 70, 229)');

      // 4. Inject temporary style node
      const tempStyleNode = document.createElement('style');
      tempStyleNode.id = 'temp-pdf-style-fix';
      tempStyleNode.innerHTML = processedCss;
      document.head.appendChild(tempStyleNode);

      // 5. Disable all original styles
      nodesToDisable.forEach(node => {
        node.disabled = true;
      });
      linkTagsToDisable.forEach(link => {
        link.disabled = true;
      });

      // 6. Capture the cleaned clone
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // 7. Cleanup clone and temporary styles, and restore original styles
      clone.remove();
      
      const tempNode = document.getElementById('temp-pdf-style-fix');
      if (tempNode) {
        tempNode.remove();
      }

      nodesToDisable.forEach(node => {
        node.disabled = false;
      });
      linkTagsToDisable.forEach(link => {
        link.disabled = false;
      });

      window.scrollTo(0, scrollPos);

      // 8. Generate PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Mess_Report_${data.stats.monthName}.pdf`);
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      alert("পিডিএফ জেনারেট করতে সমস্যা হয়েছে: " + error?.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data?.stats) {
    return (
      <div className="w-full mt-10">
        <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">কোনো চলমান মাস নেই</h2>
          <p className="text-gray-500">চলমান মাসের কোনো হিসাব পাওয়া যায়নি।</p>
        </div>
      </div>
    );
  }

  const { stats, members } = data;

  return (
    <div className="w-full mt-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-500" />
            চলমান মাসের হিসাব
          </h2>
          <p className="text-gray-500 mt-1">মাস: <span className="font-semibold text-gray-700">{stats.monthName}</span></p>
        </div>
        <div className="flex gap-3">
           <button onClick={() => window.print()} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors flex items-center gap-2">
             <Printer className="w-4 h-4" /> প্রিন্ট
           </button>
           <button 
            onClick={handleDownloadPDF} 
            disabled={downloading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
           >
             {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
             {downloading ? "ডাউনলোড হচ্ছে..." : "পিডিএফ ডাউনলোড"}
           </button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6 bg-gray-50/50 p-4 rounded-xl">
        {/* Global Summary Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
           <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
             <h3 className="font-bold text-gray-800">মাসের সারসংক্ষেপ (Summary) - {stats.monthName}</h3>
           </div>
           <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">মোট মিল</p>
                  <p className="text-xl font-black text-gray-900">{stats.totalMeals.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">মিল রেট</p>
                  <p className="text-xl font-black text-gray-900">{stats.mealRate.toFixed(2)} ৳</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">মোট জমা</p>
                  <p className="text-xl font-black text-emerald-600">{stats.totalDeposit.toFixed(2)} ৳</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">মোট খরচ</p>
                  <p className="text-xl font-black text-rose-600">{stats.totalExpense.toFixed(2)} ৳</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">মেস ব্যালেন্স</p>
                  <p className={cn("text-xl font-black", stats.balance >= 0 ? "text-emerald-600" : "text-rose-600")}>{stats.balance.toFixed(2)} ৳</p>
                </div>
              </div>
           </div>
        </div>

        {/* Detailed Member Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
             <h3 className="font-bold text-gray-800">মেম্বারদের বিস্তারিত হিসাব</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200">
                  <th className="p-4 text-sm font-bold text-gray-500 uppercase whitespace-nowrap">মেম্বারের নাম</th>
                  <th className="p-4 text-sm font-bold text-gray-500 uppercase text-center whitespace-nowrap">মোট মিল</th>
                  <th className="p-4 text-sm font-bold text-gray-500 uppercase text-center whitespace-nowrap">মিল খরচ</th>
                  <th className="p-4 text-sm font-bold text-gray-500 uppercase text-center whitespace-nowrap">যৌথ খরচ</th>
                  <th className="p-4 text-sm font-bold text-gray-500 uppercase text-center whitespace-nowrap">একক খরচ</th>
                  <th className="p-4 text-sm font-bold text-gray-500 uppercase text-center whitespace-nowrap">মোট খরচ</th>
                  <th className="p-4 text-sm font-bold text-gray-500 uppercase text-center whitespace-nowrap">জমা</th>
                  <th className="p-4 text-sm font-bold text-gray-500 uppercase text-right whitespace-nowrap">ব্যালেন্স</th>
                  {(mongoUser?.role === 'Manager' || mongoUser?.role === 'Super Admin') && (
                    <th className="p-4 text-sm font-bold text-gray-500 uppercase text-center whitespace-nowrap">অ্যাকশন</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">কোনো মেম্বার নেই।</td>
                  </tr>
                ) : (
                  members.map((member: any) => (
                    <tr key={member._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-sm font-black text-gray-900 uppercase whitespace-nowrap">{member.name}</td>
                      <td className="p-4 text-sm font-bold text-gray-700 text-center">{member.totalMeal.toFixed(2)}</td>
                      <td className="p-4 text-sm font-bold text-gray-700 text-center">{member.mealCost.toFixed(2)} ৳</td>
                      <td className="p-4 text-sm font-bold text-gray-700 text-center">{member.jointCost.toFixed(2)} ৳</td>
                      <td className="p-4 text-sm font-bold text-gray-700 text-center">{member.singleCost.toFixed(2)} ৳</td>
                      <td className="p-4 text-sm font-black text-rose-600 text-center bg-rose-50/30">{member.totalCost.toFixed(2)} ৳</td>
                      <td className="p-4 text-sm font-black text-emerald-600 text-center bg-emerald-50/30">{member.deposit.toFixed(2)} ৳</td>
                      <td className={cn("p-4 text-sm font-black text-right", member.balance >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                        {member.balance > 0 ? '+' : ''}{member.balance.toFixed(2)} ৳
                      </td>
                      {(mongoUser?.role === 'Manager' || mongoUser?.role === 'Super Admin') && (
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleRemoveMember(member)}
                            className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                            title="মেম্বার রিমুভ করুন"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="mt-8 border-t border-gray-200 pt-8">
        <LedgerTable />
      </div>

    </div>
  );
}
