import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/tag";
import { Icon } from "@/components/ui/icon";
import type {
  DashboardData,
  ActiveStudent,
} from "@/features/company/app/dashboard/queries";

type DashboardViewProps = {
  data: DashboardData;
};

const STATUS_LABELS: Record<string, string> = {
  sent: "送信済み",
  read: "既読",
  accepted: "承諾済み",
};

export function DashboardView({ data }: DashboardViewProps) {
  const { companyName, totals, unconfirmedMessages, activeStudents } = data;

  return (
    <div className="space-y-10">
      {unconfirmedMessages > 0 && (
        <UnconfirmedAlert count={unconfirmedMessages} />
      )}

      <AuthorityHeader companyName={companyName} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon="school"
          label="選考中学生数"
          value={totals.activeStudents}
          unit="名"
        />
        <StatCard
          icon="send"
          label="送信したスカウト数"
          value={totals.totalScoutsSent}
          unit="通"
        />
        <StatCard
          icon="percent"
          label="スカウト承諾率"
          value={totals.acceptanceRate}
          unit="%"
        />
        <StatCard
          icon="inventory"
          label="残りスカウト数"
          value={totals.remainingScouts}
          unit="通"
          accent
        />
      </div>

      <section>
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-xl font-bold text-primary">選考中の学生</h4>
          <Link
            href="/company/students"
            className="text-xs font-bold text-primary-container hover:underline tracking-widest uppercase"
          >
            学生検索へ
          </Link>
        </div>
        <ActiveStudentList students={activeStudents} />
      </section>
    </div>
  );
}

function UnconfirmedAlert({ count }: { count: number }) {
  return (
    <div className="bg-error-container rounded-lg p-4 flex items-center gap-3">
      <Icon name="mark_email_unread" className="text-on-error-container" />
      <p className="text-sm font-bold text-on-error-container">
        未確認のメッセージが {count} 件あります！
      </p>
      <Link
        href="/company/messages"
        className="ml-auto text-xs font-bold text-on-error-container underline"
      >
        確認する
      </Link>
    </div>
  );
}

function AuthorityHeader({ companyName }: { companyName: string }) {
  const monthLabel = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
  }).format(new Date());
  return (
    <section className="flex justify-between items-end">
      <div className="max-w-2xl">
        <Eyebrow className="mb-2">Monthly Overview</Eyebrow>
        <h2 className="text-4xl font-extrabold text-primary leading-tight tracking-tight">
          採用ダッシュボード
        </h2>
        <p className="text-on-surface-variant mt-2 text-sm">
          {companyName ? `${companyName} の` : ""}
          {monthLabel}の採用状況
        </p>
      </div>
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
  accent,
}: {
  icon: string;
  label: string;
  value: number;
  unit: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={accent ? "border-l-4 border-tertiary-container" : undefined}
    >
      <div className="flex items-center justify-between mb-4">
        <Icon
          name={icon}
          className={
            accent ? "text-tertiary-container" : "text-primary-container"
          }
        />
        <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
          {label}
        </span>
      </div>
      <p className="text-3xl font-extrabold text-primary">
        {value.toLocaleString()}
        <span className="text-xs ml-1 font-bold text-on-surface-variant">
          {unit}
        </span>
      </p>
    </Card>
  );
}

function ActiveStudentList({ students }: { students: ActiveStudent[] }) {
  if (students.length === 0) {
    return (
      <Card>
        <p className="text-sm text-on-surface-variant">
          選考中の学生がいません。学生検索からスカウトを送信してください。
        </p>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {students.map((s) => (
        <ActiveStudentCard key={s.id} student={s} />
      ))}
    </div>
  );
}

function ActiveStudentCard({ student }: { student: ActiveStudent }) {
  const initials = student.name.slice(0, 1);
  const statusLabel = STATUS_LABELS[student.status] ?? student.status;
  const sentDate = new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(student.sentAt));

  return (
    <Card className="flex items-center justify-between hover:bg-surface-container-low transition-colors group">
      <div className="flex items-center gap-6">
        <div className="w-14 h-14 rounded-full bg-primary-container grid place-items-center text-white text-lg font-bold">
          {initials}
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h5 className="text-lg font-bold text-primary">{student.name}</h5>
            <span className="text-[10px] font-bold text-on-tertiary-fixed bg-tertiary-fixed px-2 py-0.5 rounded-full uppercase tracking-wider">
              {statusLabel}
            </span>
          </div>
          <div className="flex gap-4 mt-1">
            {student.university && (
              <span className="text-xs text-on-surface-variant flex items-center gap-1">
                <Icon name="school" className="text-sm" />
                {student.university}
              </span>
            )}
            {student.prefecture && (
              <span className="text-xs text-on-surface-variant flex items-center gap-1">
                <Icon name="location_on" className="text-sm" />
                {student.prefecture}
              </span>
            )}
            <span className="text-xs text-on-surface-variant flex items-center gap-1">
              <Icon name="schedule" className="text-sm" />
              {sentDate} 送信
            </span>
          </div>
        </div>
      </div>
      <Link
        href={`/company/students/${student.studentId}`}
        className="px-4 py-2 bg-surface text-primary text-xs font-bold rounded-lg hover:bg-primary hover:text-white transition-all flex items-center"
      >
        詳細を見る
      </Link>
    </Card>
  );
}
