
import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, Package, BarChart2, Users, LineChart } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  {
    title: "POS",
    path: "/",
    icon: ShoppingCart,
  },
  {
    title: "Produk",
    path: "/products",
    icon: Package,
  },
  {
    title: "Penjualan",
    path: "/sales",
    icon: BarChart2,
  },
  {
    title: "Users",
    path: "/users",
    icon: Users,
  },
  {
    title: "Analytics",
    path: "/analytics",
    icon: LineChart,
  },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="w-12">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={location.pathname === item.path ? "bg-accent" : ""}
                  >
                    <Link to={item.path} className="flex items-center justify-center p-2">
                      <item.icon className="h-4 w-4" />
                      <span className="sr-only">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
