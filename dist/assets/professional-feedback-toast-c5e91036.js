const s="professional-feedback-toast-style",i="professional-feedback-toast",t="professional-feedback-toast-body",d="professional-feedback-toast-success",p="professional-feedback-toast-error",n="professional-feedback-toast-info",c="professional-feedback-toast-warning",b=()=>{if(typeof document>"u"||document.getElementById(s))return;const e=document.createElement("style");e.id=s,e.textContent=`
    .${i} {
      min-height: 0 !important;
      border-radius: 20px !important;
      border: 1px solid rgba(148, 163, 184, 0.18) !important;
      box-shadow: 0 22px 48px rgba(15, 23, 42, 0.18) !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
    .${d} {
      background: linear-gradient(135deg, #f8fffd 0%, #ecfeff 52%, #f0fdf4 100%) !important;
      border-left: 4px solid #0f766e !important;
    }
    .${p} {
      background: linear-gradient(135deg, #fff7ed 0%, #fff1f2 54%, #ffffff 100%) !important;
      border-left: 4px solid #dc2626 !important;
    }
    .${n} {
      background: linear-gradient(135deg, #f5fbff 0%, #ecfeff 48%, #f8fafc 100%) !important;
      border-left: 4px solid #0891b2 !important;
    }
    .${c} {
      background: linear-gradient(135deg, #fffaf0 0%, #fef3c7 44%, #ffffff 100%) !important;
      border-left: 4px solid #d97706 !important;
    }
    .${t} {
      padding: 14px 40px 14px 16px !important;
      white-space: pre-line !important;
      font-size: 13px !important;
      line-height: 1.5 !important;
      font-weight: 700 !important;
      color: #0f172a !important;
      letter-spacing: -0.01em !important;
    }
    .${t}::first-line {
      color: #020617 !important;
    }
  `,document.head.appendChild(e)},g=(e,r,o,a="",l=3600)=>{b();const f=e==null?void 0:e[r];if(typeof f!="function"||!o)return;const S=String(r||"info").trim().toLowerCase(),m={success:d,error:p,info:n,warning:c}[S]||n;return f(a?`${o}
${a}`:o,{timeout:l,icon:!1,closeButton:"button",hideProgressBar:!0,toastClassName:[i,m],bodyClassName:t})};export{g as s};
