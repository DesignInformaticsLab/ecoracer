# noinspection PyPep8

import numpy as np
import matplotlib.pyplot as plt
import psycopg2
import subprocess
from scipy import spatial
# status = subprocess.Popen(["python", "C:\doiUsers\Hope\TEST\TEST.py"]) #execute a python script for testing
# subprocess.check_output("echo hello", shell=True)  # this works

# trying to output system output, not working, have no clue
# status = subprocess.Popen(["cmd", "echo hello"], stdout=subprocess.PIPE, bufsize=5)
# text = status.communicate()[0]
# print(text)


# define class for state
class State:
    def __init__(self, dbdata):
        self.d = [dbdata[i] for i in range(4)]  # in list
        self.speed = self.d[0]
        self.time = self.d[1]
        self.slope = self.d[2]
        self.distance = self.d[3]

    def myprint(self):
        print('state:', self.d)
# define class for tuple
class Tuple:
    def __init__(self, dbdata):
        self.d = dbdata
        self.state_ini = State(self.d[1:5])
        self.act = self.d[5]
        self.reward = self.d[6]
        self.state_end = State(self.d[7:11])

    def myprint(self):
        self.state_ini.myprint()
        print('act/reward:', [self.act, self.reward])
        self.state_end.myprint()
#         self.winning_end = db_data[11]
#         self.used = db_data[12]
#         self.initial = db_data[13]
#         self.playID = db_data[14]

class VI:
    def __init__(self, ctr_para):
        self.d = ctr_para
        # parameters for value iteration
        self.alpha = self.d[0]  # learning rate 
        self.gamma = self.d[1]  # discount rate
        self.state_width = self.d[2]  # four elements in each state
        self.k = self.d[3]  # number of nearest neighbor
        self.cvg = self.d[4]  # four elements in each state
        self.maxitr = self.d[5]  # four elements in each state
        self.VP = {}    # value table and policy table
        self.tuples = []    # tuples for both human demonstration and exploration
        self.states = []    # tmp list for all states
        self.states_tp = () #restore all states into a tuple, because many methods doesn't support class and list
        # self.kdtree

    def read_db(self):
        ################## NOT WORKING!!!!!!!!!!!!
        status = subprocess.Popen(["cmd", "set PGPASSWORD=GWC464doi"])
        status = subprocess.Popen(["cmd", "psql -U postgres -d postgres -a -f ..\create_database_policysynthesis_vt.sql"])
        print("policy exploration database refreshed")
        # read data form database
        conn = psycopg2.connect("dbname=postgres user=postgres password=GWC464doi")
        cur = conn.cursor()
        cur.execute("SELECT * from ecoracer_learning_ps_table;")
        psdb = cur.fetchall()
        # this could be reduced reading times for exploration
        cur.execute("SELECT count(*) from ecoracer_learning_ps_table where id>0;")
        cur.close()
        print("read initial database done!")
        return psdb

    def init(self):

        # transfer database into tuples
        psdb = self.read_db()
        tuples = self.tuples
        cnt = 0
        for dbdata in psdb:
            cnt += 1
            assert cnt == dbdata[0], "error in reading database"
            tuples.append(Tuple(dbdata))

        # store in list for kd tree search
        for tuplei in tuples:
            self.states.append(tuplei.state_ini.d)
        self.states.append(tuples[-1].state_end.d)

        # normalize state variables
        max_var = []
        for j in range(self.state_width):
            max_var.append(max([self.states[i][j] for i in range(len(self.states))]))
            for i in range(len(self.states)):
                self.states[i][j] /= max_var[j]
                try:
                    tuples[i].state_end.d[j] = tuples[i].state_end.d[j] / max_var[j]
                except:
                    print("there are one more states than tuples")
        for idx, statei in enumerate(self.states):
            self.states_tp += (tuple(statei),)
        # initial kd tree for KNN
        self.kdtree = spatial.cKDTree(self.states_tp)  # build the kd tree

        # initial Value function and optimal policy
        VP = self.VP
        for idx, statei in enumerate(self.states_tp):
            VP[statei] = [0, False]

    def vptest(self, state_tp, VP, plott):
        y = np.zeros(len(state_tp))
        yy = np.zeros(len(state_tp))
        x = np.linspace(1, len(y), len(y))
        for idx, statei in enumerate(state_tp):
                y[idx] = VP[statei][0]
                yy[idx] = VP[statei][1]
        np.savetxt('x.txt', zip(y, yy))
        if plott:
            plt.figure()
            plt.semilogy(x, np.abs(y), '*-')
            plt.grid(True)
            plt.xlim(1, len(y)+1)
            # plt.draw()
            plt.show()
        return y

    def intp_v(self, si):
        VP = self.VP
        search_dis = 0.002
        k = self.k    # should specify number of points instead of distance?
        sum_v = 0
        nb_idx = self.kdtree.query_ball_point(si, search_dis)  # search points inside hyper-sphere with r
        if not nb_idx:
            assert 0, "KNN needs larger search distance."  # this won't happen in the first VI
        for i, idx in enumerate(nb_idx):
            sum_v += VP[self.states_tp[idx]][0]

        sum_v /= len(nb_idx)
        # print(nb_state)
        return sum_v

    def iterating(self):
        vptest = self.vptest
        VP = self.VP
        intp_v = self.intp_v
        alpha = self.alpha
        gamma = self.gamma

        # looping for value iteration
        cnt = 0
        convergence = 1
        tuples = self.tuples

        print("starting value iteration...")
        while cnt < self.maxitr:

            for idx, tuplei in enumerate(tuples):
                try:
                    si = tuple(tuplei.state_end.d)
                    V_prim = intp_v(si)  # end state is the same with next ini state
                except:
                    print(idx)
                si = tuple(tuplei.state_ini.d)
                V = intp_v(si)
                r = tuplei.reward
                delta = r + gamma * V_prim - V
                si = tuple(tuplei.state_ini.d)
                vi = VP[si][0]
                if delta > 0:
                    VP[si] = [vi + alpha * delta, True]
                else:
                    VP[si] = [vi + alpha * (V - vi), False]

            if cnt == 0:
                y = vptest(self.states_tp, VP, 0)
            else:
                y_pre = y
                y = vptest(self.states_tp, VP, 0)
                convergence = np.sum((y_pre-y)**2)/np.sum(y**2)
                convergence = np.sqrt(convergence)

            print(cnt, convergence, len(VP))
            if cnt == self.maxitr-1 or convergence < self.cvg:
                vptest(self.states_tp, VP, 1)
                break
            cnt += 1
        print("value iteration done!")

    def savedb(self):
        tuples = self.tuples
        VP = self.VP
        # append result of value iteration to database
        con = psycopg2.connect("dbname='postgres' user='postgres' password=GWC464doi")
        cur = con.cursor()

        # current size
        cur.execute("SELECT COUNT(*) FROM ecoracer_learning_ps_value_table; ")
        vtable_size = cur.fetchall()[0][0]

        # Append those new items to Vaule table
        for idx, statei in enumerate(self.states_tp):
        # for count, (state,vp) in enumerate(VP.iteritems(), start=1+vtable_size):
            cur.execute("INSERT INTO ecoracer_learning_ps_value_table VALUES ( %s, %s, %s, %s, %s, %s, %s)",
                        (idx, statei[0], statei[1], statei[2], statei[3], VP[statei][0], VP[statei][1],))
        con.commit()
        cur.close()


# self.alpha = self.d[0]  # learning rate
# self.gamma = self.d[1]  # discount rate
# self.state_width = self.d[2]  # four elements in each state
# self.k = self.d[3]  # number of nearest neighbor
# self.cvg = self.d[4]  # four elements in each state
# self.maxitr = self.d[5]  # four elements in each state

ctr_para = [0.1, 0.5, 4, 10, 1e-3, 100]
vi = VI(ctr_para)
vi.init()
vi.iterating()
vi.savedb()

















