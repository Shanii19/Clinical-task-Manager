import { useAuth } from '@/contexts/AuthContext';
import { CustomDashboard } from '@/components/CustomDashboard';

const Dashboard = () => {
  const { loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>;
  }

  return <CustomDashboard />;
};

export default Dashboard;
